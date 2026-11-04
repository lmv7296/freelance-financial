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
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { FormModal } from "@/components/FormModal";
import { InfoModal } from "@/components/InfoModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_LINE_ITEMS,
  INITIAL_INVOICES,
  STATUS_FILTERS,
} from "@/data/invoices";
import { getRelativeDueDateLabel } from "@/lib/dateUtils";
import { calculateLineItemsTotals, formatEuro } from "@/lib/formatCurrency";
import { useT } from "@/lib/preferences/PreferencesContext";
import {
  CREATE_INVOICE_FIELDS,
  CREATE_INVOICE_STEPS,
} from "@/schemas/invoiceFormSchema";

export default function InvoicesPage() {
  const t = useT();
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInvoiceForInfo, setSelectedInvoiceForInfo] = useState(null);

  // Filter invoices based on status tab and search query
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesFilter =
        activeFilter === "All" || inv.status === activeFilter;
      const matchesSearch =
        inv.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.tradeType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [invoices, activeFilter, searchQuery]);

  // Aggregate stats
  const pendingCount = invoices.filter((i) => i.status === "Pending").length;
  const overdueCount = invoices.filter((i) => i.status === "Overdue").length;

  // Payment links, reminders and exports don't exist yet; say so instead of pretending
  const comingSoon = () => alert(t("common.comingSoon"));
  const tradeLabel = (value) => {
    const label = t(`invoices.tradeTypes.${value}`);
    return label.startsWith("invoices.") ? value : label;
  };

  const handleCreateInvoice = (formData) => {
    const isBedrijf = formData.clientType === "bedrijf";
    const clientName = isBedrijf
      ? formData.companyName?.trim() || t("invoices.page.defaultCompany")
      : formData.clientName?.trim() || t("invoices.page.defaultPerson");

    const items =
      Array.isArray(formData.items) && formData.items.length > 0
        ? formData.items
        : DEFAULT_LINE_ITEMS;

    const { total } = calculateLineItemsTotals(items, formData.vatRate || "21");
    const formattedAmount = formatEuro(total);

    const mainProjectDesc =
      items
        .map((it) => t(it.description)?.trim())
        .filter(Boolean)
        .join(" • ") || t("invoices.page.defaultDescription");

    const newInvoice = {
      id:
        formData.invoiceNumber?.trim() ||
        `INV-${Math.floor(2050 + Math.random() * 500)}`,
      client: clientName,
      tradeType: formData.tradeType || "Electrician",
      project: mainProjectDesc,
      issued: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }).format(new Date()),
      due: formData.due
        ? new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }).format(new Date(formData.due))
        : "Oct 27, 2026",
      dueDateRelative: getRelativeDueDateLabel(formData.due, formData.status),
      amount: formattedAmount,
      status: formData.status || "Pending",
      method: formData.method || "Tikkie / iDEAL QR",
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    setIsCreateModalOpen(false);
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
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-muted text-muted-foreground border-border/60">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            {t("invoices.status.Draft")}
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
            onClick={() => setIsCreateModalOpen(true)}
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
          value="€28.790,00"
          trend="+16.4%"
          trendLabel={t("invoices.page.trendQuarter")}
          icon={<FileText className="size-5" />}
          iconColor="primary"
          variant="elevated"
        />

        <Card
          title={t("invoices.page.openTitle")}
          description={t("invoices.page.openDescription", {
            count: pendingCount,
          })}
          value="€4.090,00"
          trend={t("invoices.page.openTrend")}
          trendDirection="neutral"
          icon={<Clock className="size-5" />}
          iconColor="amber"
          variant="elevated"
        />

        <Card
          title={t("invoices.page.overdueTitle")}
          description={t("invoices.page.overdueDescription", {
            count: overdueCount,
          })}
          value="€620,00"
          trend={t("invoices.page.overdueTrend")}
          trendDirection="down"
          icon={<Mail className="size-5" />}
          iconColor="rose"
          variant="elevated"
        />

        <Card
          title={t("invoices.page.paidTitle")}
          description={t("invoices.page.paidDescription")}
          value="€14.850,00"
          trend="+11.2%"
          trendLabel={t("invoices.page.trendPrevious")}
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
              {filteredInvoices.length > 0 ? (
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
                          <p className="font-bold text-foreground">{inv.id}</p>
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
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-medium shrink-0">
                          {tradeLabel(inv.tradeType)}
                        </span>
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

                        {/* Remind */}
                        {inv.status === "Overdue" ||
                        inv.status === "Pending" ? (
                          <button
                            type="button"
                            onClick={comingSoon}
                            className="size-7.5 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all cursor-pointer"
                            title={t("invoices.page.remind")}
                          >
                            <Mail className="size-3.5" />
                          </button>
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
      />

      {/* 6. Reusable InfoModal: View Invoice Information (Entirely Driven by Props) */}
      {selectedInvoiceForInfo && (
        <InfoModal
          isOpen={Boolean(selectedInvoiceForInfo)}
          onClose={() => setSelectedInvoiceForInfo(null)}
          title={t("invoices.info.title", { id: selectedInvoiceForInfo.id })}
          description={`${selectedInvoiceForInfo.client} • ${tradeLabel(selectedInvoiceForInfo.tradeType)}`}
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
              value: selectedInvoiceForInfo.id,
              copyable: true,
            },
            {
              label: t("invoices.info.client"),
              value: selectedInvoiceForInfo.client,
            },
            {
              label: t("invoices.info.trade"),
              value: tradeLabel(selectedInvoiceForInfo.tradeType),
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
              value: selectedInvoiceForInfo.method,
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
              value: selectedInvoiceForInfo.project,
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
