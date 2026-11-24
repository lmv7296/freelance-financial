"use client";

import {
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ServerCrash,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormModal } from "@/components/FormModal";
import { InfoModal } from "@/components/InfoModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { invoiceDisplayStatus } from "@/data/clients";
import { DEFAULT_LINE_ITEMS, STATUS_FILTERS } from "@/data/invoices";
import { clientsApi } from "@/lib/api/clients";
import { invoicesApi } from "@/lib/api/invoices";
import { formatDate, getRelativeDueDateLabel } from "@/lib/dateUtils";
import { formatEuro, parseCurrency } from "@/lib/formatCurrency";
import { useT } from "@/lib/preferences/PreferencesContext";
import {
  CREATE_INVOICE_FIELDS,
  CREATE_INVOICE_STEPS,
} from "@/schemas/invoiceFormSchema";

// Form status → backend status
const FORM_STATUS = { Pending: "SENT", Paid: "PAID", Draft: "DRAFT" };

/** Local calendar date as YYYY-MM-DD, comparable with invoice dates */
function toIsoDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Backend invoice → the row the table and info modal show */
function toInvoiceView(inv, today) {
  const status = invoiceDisplayStatus(inv, today);
  return {
    id: inv.id,
    number: inv.invoice_number,
    client: inv.client_name || "—",
    tradeType: inv.trade_type || "",
    project: inv.description || "",
    issueDate: inv.issue_date,
    dueDate: inv.due_date,
    paidAt: inv.paid_at,
    issued: formatDate(inv.issue_date),
    due: formatDate(inv.due_date),
    dueDateRelative:
      status === "Cancelled"
        ? ""
        : getRelativeDueDateLabel(inv.due_date, status),
    totalCents: inv.total_cents ?? 0,
    subtotalCents: inv.subtotal_cents ?? 0,
    amount: formatEuro((inv.total_cents ?? 0) / 100),
    status,
    method: inv.payment_method || "",
  };
}

const sumCents = (list, key = "totalCents") =>
  list.reduce((acc, inv) => acc + (inv[key] ?? 0), 0);

export default function InvoicesPage() {
  const t = useT();
  const [apiInvoices, setApiInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [markingPaidId, setMarkingPaidId] = useState(null);
  // "Today" is captured when data loads, never during render (Cache Components
  // would otherwise bake the build date into the prerendered page)
  const [today, setToday] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // Clients are only needed to reuse one when creating an invoice
      const [invoicesRes, clientsRes] = await Promise.all([
        invoicesApi.list(),
        clientsApi.list().catch(() => ({ clients: [] })),
      ]);
      setApiInvoices(invoicesRes?.invoices ?? []);
      setClients(clientsRes?.clients ?? []);
      setToday(toIsoDate(new Date()));
    } catch (err) {
      setLoadError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const invoices = useMemo(
    () => apiInvoices.map((inv) => toInvoiceView(inv, today)),
    [apiInvoices, today],
  );
  const selectedInvoiceForInfo =
    invoices.find((inv) => inv.id === selectedInvoiceId) ?? null;
  const setSelectedInvoiceForInfo = (inv) =>
    setSelectedInvoiceId(inv?.id ?? null);

  // Filter invoices based on status tab and search query
  const filteredInvoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchesFilter =
        activeFilter === "All" || inv.status === activeFilter;
      const matchesSearch =
        !query ||
        [inv.client, inv.number, inv.project, inv.tradeType].some((v) =>
          v?.toLowerCase().includes(query),
        );
      return matchesFilter && matchesSearch;
    });
  }, [invoices, activeFilter, searchQuery]);

  // Key figures, all from the invoices above
  const stats = useMemo(() => {
    const year = today?.slice(0, 4);
    const month = today?.slice(0, 7);
    const billed = invoices.filter(
      (i) => i.status !== "Draft" && i.status !== "Cancelled",
    );
    const pending = invoices.filter(
      (i) => i.status === "Pending" || i.status === "Overdue",
    );
    const overdue = invoices.filter((i) => i.status === "Overdue");
    const paidThisMonth = invoices.filter(
      (i) => i.status === "Paid" && month && i.paidAt?.startsWith(month),
    );
    return {
      invoicedThisYear: sumCents(
        billed.filter((i) => year && i.issueDate?.startsWith(year)),
        "subtotalCents",
      ),
      pendingCount: pending.length,
      pendingCents: sumCents(pending),
      overdueCount: overdue.length,
      overdueCents: sumCents(overdue),
      paidThisMonthCents: sumCents(paidThisMonth),
    };
  }, [invoices, today]);
  const statValue = (cents) => (isLoading ? "—" : formatEuro(cents / 100));

  // Payment links, reminders and exports don't exist yet; say so instead of pretending
  const comingSoon = () => alert(t("common.comingSoon"));
  const tradeLabel = (value) => {
    if (!value) return "";
    const label = t(`invoices.tradeTypes.${value}`);
    return label.startsWith("invoices.") ? value : label;
  };

  /** Reuses a client with the same name and type, or creates one from the form */
  const findOrCreateClient = async (formData) => {
    const isBedrijf = formData.clientType === "bedrijf";
    const name = (
      isBedrijf ? formData.companyName : formData.clientName
    )?.trim();
    const type = isBedrijf ? "bedrijf" : "particulier";
    const existing = clients.find(
      (c) =>
        c.type === type && c.name.trim().toLowerCase() === name?.toLowerCase(),
    );
    if (existing) return existing;

    const text = (value) => (typeof value === "string" ? value.trim() : "");
    const { client } = await clientsApi.create({
      type,
      name,
      phone: text(isBedrijf ? formData.companyPhone : formData.clientPhone),
      email: text(isBedrijf ? formData.companyEmail : formData.clientEmail),
      address_line1: text(
        isBedrijf ? formData.companyAddress : formData.clientAddress,
      ),
      ...(isBedrijf && {
        contact_person: text(formData.contactPerson),
        vat_number: text(formData.vatNumber),
        kvk_number: text(formData.kvkNumber).replace(/\s/g, ""),
      }),
    });
    setClients((prev) => [...prev, client]);
    return client;
  };

  const handleCreateInvoice = async (formData, { resetForm }) => {
    setSaveError(null);
    const items =
      Array.isArray(formData.items) && formData.items.length > 0
        ? formData.items
        : DEFAULT_LINE_ITEMS;
    const lineItems = items.map((it) => ({
      // Default lines are translation keys
      description: t(it.description || "")?.trim() || "",
      quantity: Number.parseFloat(it.quantity) || 0,
      unit_price_cents: Math.round(parseCurrency(it.unitPrice) * 100),
    }));
    const description =
      lineItems
        .map((it) => it.description)
        .filter(Boolean)
        .join(" • ") || t("invoices.page.defaultDescription");

    try {
      const client = await findOrCreateClient(formData);
      const { invoice } = await invoicesApi.create({
        client_id: client.id,
        invoice_number: formData.invoiceNumber?.trim() || undefined,
        due_date: formData.due || undefined,
        status: FORM_STATUS[formData.status] ?? "SENT",
        vat_rate: Number.parseFloat(formData.vatRate ?? "21"),
        trade_type: formData.tradeType || "",
        payment_method: formData.method || "",
        description,
        line_items: lineItems,
      });
      setApiInvoices((prev) => [invoice, ...prev]);
      resetForm();
      setIsCreateModalOpen(false);
    } catch (err) {
      // Keep the modal open with what was typed
      setSaveError(err);
    }
  };

  const handleMarkPaid = async (invoice) => {
    setMarkingPaidId(invoice.id);
    try {
      const { invoice: updated } = await invoicesApi.update(invoice.id, {
        status: "PAID",
      });
      setApiInvoices((prev) =>
        prev.map((inv) => (inv.id === updated.id ? updated : inv)),
      );
    } catch (err) {
      alert(t("invoices.page.markPaidFailed", { message: err.message }));
    } finally {
      setMarkingPaidId(null);
    }
  };

  const openCreateModal = () => {
    setSaveError(null);
    setIsCreateModalOpen(true);
  };

  const getStatusChip = (status) => {
    switch (status) {
      case "Paid":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {t("invoices.status.Paid")}
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25">
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            {t("invoices.status.Pending")}
          </span>
        );
      case "Overdue":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25">
            <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
            {t("invoices.status.Overdue")}
          </span>
        );
      default:
        // Draft or Cancelled
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-muted text-muted-foreground border-border/60 ${status === "Cancelled" ? "line-through" : ""}`}
          >
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            {t(`invoices.status.${status}`)}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 space-y-6 font-sans">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
              <FileText className="size-3" />
              {t("invoices.page.badge")}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {t("invoices.page.methods")}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
            {t("invoices.page.title")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t("invoices.page.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={comingSoon}
            className="rounded-full px-4 shadow-2xs hover:bg-muted/70 active:scale-[0.97] transition-all font-medium text-xs h-9 cursor-pointer"
          >
            <Download className="size-3.5 mr-1.5" />
            {t("invoices.page.exportCsv")}
          </Button>
          <Button
            onClick={openCreateModal}
            className="rounded-full px-4.5 shadow-sm hover:shadow-md active:scale-[0.97] transition-all font-semibold text-xs h-9 cursor-pointer"
          >
            <Plus className="size-4 mr-1.5" />
            {t("invoices.page.new")}
          </Button>
        </div>
      </div>

      {/* 2. Key Metrics Row (Asymmetric Bento with Gradient Icon Pods) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title={t("invoices.page.totalTitle")}
          description={t("invoices.page.totalDescription")}
          value={statValue(stats.invoicedThisYear)}
          icon={<FileText className="size-5" />}
          iconColor="primary"
          variant="elevated"
        />

        <Card
          title={t("invoices.page.openTitle")}
          description={t("invoices.page.openDescription", {
            count: stats.pendingCount,
          })}
          value={statValue(stats.pendingCents)}
          icon={<Clock className="size-5" />}
          iconColor="amber"
          variant="elevated"
        />

        <Card
          title={t("invoices.page.overdueTitle")}
          description={t("invoices.page.overdueDescription", {
            count: stats.overdueCount,
          })}
          value={statValue(stats.overdueCents)}
          trend={
            stats.overdueCount > 0 ? t("invoices.page.overdueTrend") : undefined
          }
          trendDirection="down"
          icon={<Mail className="size-5" />}
          iconColor="rose"
          variant="elevated"
        />

        <Card
          title={t("invoices.page.paidTitle")}
          description={t("invoices.page.paidDescription")}
          value={statValue(stats.paidThisMonthCents)}
          icon={<Check className="size-5" />}
          iconColor="emerald"
          variant="elevated"
        />
      </div>

      {/* 3. Search & Filter Bar (Apple-style tactile pills) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {STATUS_FILTERS.map((filter) => {
            const count =
              filter === "All"
                ? invoices.length
                : invoices.filter((i) => i.status === filter).length;
            const isActive = activeFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-[0.96] cursor-pointer ${
                  isActive
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
                }`}
              >
                <span>{t(`invoices.status.${filter}`)}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    isActive
                      ? "bg-background/20 text-background"
                      : "bg-background/60 text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("invoices.page.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9.5 h-9 text-xs rounded-full border-border/70 dark:border-white/[0.08]"
          />
        </div>
      </div>

      {/* 4. Invoices Table Card with Specular Rim & Translucent Depth */}
      <Card
        variant="elevated"
        className="overflow-hidden border border-border/70 dark:border-white/[0.08] shadow-xs backdrop-blur-md bg-card/90"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-sans border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-5">
                  {t("invoices.page.columns.invoice")}
                </th>
                <th className="py-3 px-5">
                  {t("invoices.page.columns.client")}
                </th>
                <th className="py-3 px-5">{t("invoices.page.columns.due")}</th>
                <th className="py-3 px-5 text-right">
                  {t("invoices.page.columns.amount")}
                </th>
                <th className="py-3 px-5 text-center">
                  {t("invoices.page.columns.status")}
                </th>
                <th className="py-3 px-5 text-right">
                  {t("invoices.page.columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {loadError ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ServerCrash className="size-5 text-rose-600" />
                      <p className="text-sm font-medium text-foreground">
                        {t("invoices.page.loadFailed")}
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {loadError.status === 0 || loadError.status === 404
                          ? t("invoices.page.serverUnavailable")
                          : loadError.message}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadInvoices}
                        className="rounded-full text-xs mt-1"
                      >
                        <RefreshCw />
                        {t("invoices.page.retry")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : isLoading ? (
                ["a", "b", "c"].map((key) => (
                  <tr key={key}>
                    <td colSpan={6} className="py-3.5 px-5">
                      <div className="h-8 rounded-lg bg-muted/60 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <p className="text-sm font-medium">
                      {t("invoices.page.emptyTitle")}
                    </p>
                    <p className="text-xs mt-1">
                      {t("invoices.page.emptyText")}
                    </p>
                  </td>
                </tr>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Invoice ID & Method */}
                    <td className="py-3.5 px-5 font-mono font-medium text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <FileText className="size-4" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">
                            {inv.number}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-sans">
                            {inv.method}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Client & Job/Order Description */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-foreground">
                          {inv.client}
                        </p>
                        {inv.tradeType && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-medium shrink-0">
                            {tradeLabel(inv.tradeType)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {inv.project}
                      </p>
                    </td>

                    {/* Issued & Due Dates */}
                    <td className="py-3.5 px-5">
                      <p className="font-medium text-foreground">{inv.due}</p>
                      <p
                        className={`text-[10px] ${
                          inv.status === "Overdue"
                            ? "text-rose-600 font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {inv.dueDateRelative}
                      </p>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-sm text-foreground tabular-nums">
                      {inv.amount}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-5 text-center">
                      {getStatusChip(inv.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Copy Link Button */}
                        <button
                          type="button"
                          onClick={comingSoon}
                          className="size-7.5 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all cursor-pointer"
                          title={t("invoices.page.copyLink")}
                        >
                          <Copy className="size-3.5" />
                        </button>

                        {/* Remind & mark as paid */}
                        {inv.status === "Overdue" ||
                        inv.status === "Pending" ? (
                          <>
                            <button
                              type="button"
                              onClick={comingSoon}
                              className="size-7.5 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all cursor-pointer"
                              title={t("invoices.page.remind")}
                            >
                              <Mail className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(inv)}
                              disabled={markingPaidId === inv.id}
                              className="size-7.5 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-700 active:scale-90 transition-all cursor-pointer disabled:opacity-50"
                              title={t("invoices.page.markPaid")}
                              aria-label={t("invoices.page.markPaid")}
                            >
                              <Check className="size-3.5" />
                            </button>
                          </>
                        ) : null}

                        {/* View Invoice -> Opens InfoModal */}
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForInfo(inv)}
                          className="size-7.5 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all cursor-pointer"
                          title={t("invoices.page.view")}
                        >
                          <ExternalLink className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <p className="text-sm font-medium">
                      {t("invoices.page.noMatchTitle")}
                    </p>
                    <p className="text-xs mt-1">
                      {t("invoices.page.noMatchText")}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. Reusable FormModal: Create Invoice (Multi-Step Wizard with Live Client Preview) */}
      <FormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateInvoice}
        title={t("invoices.page.createTitle")}
        description={t("invoices.page.createDescription")}
        icon={<FilePlus2 className="size-5" />}
        steps={CREATE_INVOICE_STEPS}
        fields={CREATE_INVOICE_FIELDS}
        submitLabel={t("invoices.page.createSubmit")}
        maxWidth="xl"
        footerNote={t("invoices.page.createFooter")}
      >
        {saveError && (
          <p
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
          >
            {t("invoices.page.saveFailed", {
              message:
                saveError.status === 0
                  ? t("invoices.page.serverUnavailable")
                  : saveError.message,
            })}
          </p>
        )}
      </FormModal>

      {/* 6. Reusable InfoModal: View Invoice Information (Entirely Driven by Props) */}
      {selectedInvoiceForInfo && (
        <InfoModal
          isOpen={Boolean(selectedInvoiceForInfo)}
          onClose={() => setSelectedInvoiceForInfo(null)}
          title={t("invoices.info.title", {
            id: selectedInvoiceForInfo.number,
          })}
          description={[
            selectedInvoiceForInfo.client,
            tradeLabel(selectedInvoiceForInfo.tradeType),
          ]
            .filter(Boolean)
            .join(" • ")}
          badge={t(`invoices.status.${selectedInvoiceForInfo.status}`)}
          icon={<FileText className="size-5" />}
          maxWidth="lg"
          banner={
            selectedInvoiceForInfo.status === "Overdue"
              ? {
                  type: "destructive",
                  title: t("invoices.info.overdueTitle"),
                  message: t("invoices.info.overdueText", {
                    date: selectedInvoiceForInfo.due,
                  }),
                }
              : undefined
          }
          items={[
            {
              label: t("invoices.info.id"),
              value: selectedInvoiceForInfo.number,
              copyable: true,
            },
            {
              label: t("invoices.info.client"),
              value: selectedInvoiceForInfo.client,
            },
            {
              label: t("invoices.info.trade"),
              value: tradeLabel(selectedInvoiceForInfo.tradeType) || "—",
            },
            {
              label: t("invoices.info.total"),
              value: selectedInvoiceForInfo.amount,
              isMoney: true,
              highlight:
                selectedInvoiceForInfo.status === "Paid"
                  ? "success"
                  : selectedInvoiceForInfo.status === "Overdue"
                    ? "destructive"
                    : "warning",
            },
            {
              label: t("invoices.info.method"),
              value: selectedInvoiceForInfo.method || "—",
            },
            {
              label: t("invoices.info.issued"),
              value: selectedInvoiceForInfo.issued,
            },
            {
              label: t("invoices.info.due"),
              value: selectedInvoiceForInfo.due,
            },
            {
              label: t("invoices.info.timing"),
              value: selectedInvoiceForInfo.dueDateRelative,
            },
            {
              label: t("invoices.info.description"),
              value: selectedInvoiceForInfo.project || "—",
              colSpan: 2,
            },
          ]}
          footerActions={[
            {
              label: t("invoices.info.close"),
              variant: "outline",
              onClick: () => setSelectedInvoiceForInfo(null),
            },
            {
              label: t("invoices.info.copyLink"),
              variant: "secondary",
              onClick: comingSoon,
            },
            {
              label: t("invoices.info.downloadPdf"),
              variant: "default",
              onClick: comingSoon,
            },
          ]}
        />
      )}
    </div>
  );
}
