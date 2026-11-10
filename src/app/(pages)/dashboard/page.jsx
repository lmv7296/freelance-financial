"use client";

import {
  ArrowUpRight,
  Download,
  FileText,
  Plus,
  QrCode,
  RefreshCw,
  ServerCrash,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clientsApi } from "@/lib/api/clients";
import { invoicesApi } from "@/lib/api/invoices";
import { settingsApi } from "@/lib/api/settings";
import { taxVaultApi } from "@/lib/api/taxVault";
import { formatDate } from "@/lib/dateUtils";
import { formatEuro } from "@/lib/formatCurrency";
import { useT } from "@/lib/preferences/PreferencesContext";

const RECENT_INVOICES_LIMIT = 5;

const LOADING = { status: "loading", data: null, error: null };

/** Turns a settled promise into `{ status, data, error }` for one dashboard section */
function toSection(result) {
  return result.status === "fulfilled"
    ? { status: "ready", data: result.value, error: null }
    : { status: "error", data: null, error: result.reason };
}

/** Local calendar date as YYYY-MM-DD, comparable with the backend's period dates */
function toIsoDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** BTW period that contains `today`, or else the first one still to be filed */
function findCurrentVatPeriod(periods, today) {
  if (!periods?.length) return null;
  return (
    (today &&
      periods.find((p) => p.start_date <= today && today <= p.end_date)) ||
    periods.find((p) => p.status === "open" || p.status === "to_file") ||
    null
  );
}

function rubriekVat(period, code) {
  return period?.rubrieken?.find((r) => r.code === code)?.vat ?? null;
}

/**
 * Splits the tax-vault figures into "free to spend" and "reserve".
 * - reserve: BTW still to pay on unfiled periods + income tax still to pay so far this year
 * - free: profit so far minus that income tax (BTW is not part of profit, it's excl. BTW)
 * All inputs are calculated by the backend; this only adds them up.
 */
function getSpendable(overview) {
  if (!overview) return null;
  const vatReserve = (overview.vat?.enabled ? overview.vat.periods : [])
    .filter((p) => p.status === "open" || p.status === "to_file")
    .reduce((sum, p) => sum + Math.max(p.balance ?? 0, 0), 0);
  const toDate =
    overview.income_tax?.status === "available"
      ? overview.income_tax.to_date
      : null;
  const incomeTax = toDate ? toDate.still_to_pay : null;
  const free = incomeTax === null ? null : overview.totals.profit - incomeTax;
  const reserve = vatReserve + (incomeTax ?? 0);
  const total = Math.max(free ?? 0, 0) + reserve;
  const freeShare = total > 0 ? Math.max(free ?? 0, 0) / total : null;
  return {
    free,
    reserve,
    vatReserve,
    incomeTax,
    freeShare,
    basisLabel: toDate?.basis_label ?? null,
  };
}

/**
 * Invoices sent to a client but not paid yet. Drafts and cancelled invoices
 * don't count. `today` is YYYY-MM-DD (or null before the first load).
 */
function getOpenInvoices(invoices, today) {
  const open = invoices.filter((inv) => inv.status === "SENT");
  return {
    count: open.length,
    total: open.reduce((sum, inv) => sum + (inv.total_cents ?? 0), 0) / 100,
    overdueCount: today
      ? open.filter((inv) => inv.due_date && inv.due_date < today).length
      : 0,
  };
}

function isOverdue(invoice, today) {
  return (
    invoice.status === "SENT" &&
    Boolean(today && invoice.due_date && invoice.due_date < today)
  );
}

function formatShare(share) {
  return `${Math.round(share * 100)}%`;
}

export default function DashboardPage() {
  const t = useT();
  const [overview, setOverview] = useState(LOADING);
  const [company, setCompany] = useState(LOADING);
  const [invoices, setInvoices] = useState(LOADING);
  const [clients, setClients] = useState(LOADING);
  // "Today" is captured when data loads, never during render (Cache Components
  // would otherwise bake the build date into the prerendered page)
  const [today, setToday] = useState(null);

  const loadDashboard = useCallback(async () => {
    setOverview(LOADING);
    setCompany(LOADING);
    setInvoices(LOADING);
    setClients(LOADING);
    const [overviewRes, companyRes, invoicesRes, clientsRes] =
      await Promise.allSettled([
        taxVaultApi.getOverview(),
        settingsApi.getCompany(),
        invoicesApi.list(),
        clientsApi.list(),
      ]);
    setToday(toIsoDate(new Date()));
    setOverview(toSection(overviewRes));
    setCompany(toSection(companyRes));
    setInvoices(toSection(invoicesRes));
    setClients(toSection(clientsRes));
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const tax = overview.data;
  const currentPeriod = tax?.vat?.enabled
    ? findCurrentVatPeriod(tax.vat.periods, today)
    : null;
  const spendable = getSpendable(tax);
  const kvkNumber = company.data?.company?.kvk_number;

  const invoiceList = invoices.data?.invoices ?? [];
  const clientList = clients.data?.clients ?? [];
  const clientNames = new Map(clientList.map((c) => [c.id, c.name]));
  // The backend already returns the newest invoices first (by issue date)
  const recentInvoices = invoiceList.slice(0, RECENT_INVOICES_LIMIT);
  const openInvoices = getOpenInvoices(invoiceList, today);

  const isLoading = overview.status === "loading";
  const isAnyLoading = [overview, company, invoices, clients].some(
    (s) => s.status === "loading",
  );
  const taxValue = (fn) =>
    overview.status === "ready" ? fn(overview.data) : "—";

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 space-y-6 font-sans">
      {/* 1. Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("dashboard.liveBadge", {
                period: currentPeriod?.label ?? (tax ? tax.tax_year : "—"),
              })}
            </span>
            {kvkNumber && (
              <span className="text-xs text-muted-foreground font-mono">
                {t("dashboard.kvk", { number: kvkNumber })}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
            {t("dashboard.title")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t("dashboard.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadDashboard}
            disabled={isAnyLoading}
            className="rounded-full px-4 shadow-2xs text-xs h-9"
          >
            <RefreshCw
              className={`size-3.5 mr-1.5 ${isAnyLoading ? "animate-spin" : ""}`}
            />
            {t("dashboard.refresh")}
          </Button>
          <Link href="/tax-vault">
            <Button
              variant="outline"
              className="rounded-full px-4 shadow-2xs hover:bg-muted/70 active:scale-[0.97] transition-all font-medium text-xs h-9 cursor-pointer"
            >
              <Download className="size-3.5 mr-1.5" />
              {t("dashboard.vatOverview")}
            </Button>
          </Link>
          <Link href="/invoices">
            <Button className="rounded-full px-4.5 shadow-sm hover:shadow-md active:scale-[0.97] transition-all font-semibold text-xs h-9 cursor-pointer">
              <Plus className="size-4 mr-1.5" />
              {t("dashboard.newInvoice")}
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Hero: free to spend vs. tax reserve */}
      <div className="rounded-3xl border border-border/80 dark:border-white/[0.08] bg-gradient-to-br from-card via-card/90 to-muted/30 p-5 sm:p-6 shadow-xs backdrop-blur-xl space-y-4">
        {overview.status === "error" ? (
          <SectionError
            title={t("dashboard.balanceLoadFailed")}
            error={overview.error}
            onRetry={loadDashboard}
          />
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {tax
                    ? t("dashboard.freeTitleYear", { year: tax.tax_year })
                    : t("dashboard.freeTitle")}
                </span>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono tabular-nums">
                    {spendable?.free != null ? formatEuro(spendable.free) : "—"}
                  </span>
                  {spendable?.free != null && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                      <TrendingUp className="size-3.5" />
                      {t("dashboard.afterTax")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isLoading ? (
                    t("dashboard.loading")
                  ) : spendable?.free != null ? (
                    t("dashboard.freeText", {
                      amount: formatEuro(spendable.reserve),
                    })
                  ) : (
                    <>
                      {t("dashboard.incomeTaxUnavailable")}{" "}
                      <Link
                        href="/tax-vault"
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        {t("dashboard.completeProfile")}
                      </Link>
                      .
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Link href="/invoices">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full gap-1.5 font-semibold text-xs h-8.5 active:scale-[0.97]"
                  >
                    <QrCode className="size-3.5 text-primary" />
                    {t("dashboard.paymentRequest")}
                  </Button>
                </Link>
                <Link href="/clients">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-1.5 font-semibold text-xs h-8.5 active:scale-[0.97]"
                  >
                    <Users className="size-3.5" />
                    {t("dashboard.clientsButton")}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Breakdown bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs font-mono flex-wrap">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary" />
                  {t("dashboard.freeTitle")}
                  {spendable?.freeShare != null &&
                    ` (${formatShare(spendable.freeShare)})`}
                </span>
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500" />
                  {t("dashboard.reserve")}{" "}
                  {spendable ? formatEuro(spendable.reserve) : "—"}
                  {spendable?.freeShare != null &&
                    ` (${formatShare(1 - spendable.freeShare)})`}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex p-0.5 border border-border/50">
                {spendable?.freeShare != null && (
                  <>
                    <div
                      className="h-full bg-primary rounded-l-full"
                      style={{ width: formatShare(spendable.freeShare) }}
                    />
                    <div
                      className="h-full bg-amber-500 rounded-r-full"
                      style={{ width: formatShare(1 - spendable.freeShare) }}
                    />
                  </>
                )}
              </div>
              {spendable?.basisLabel && (
                <p className="text-[11px] text-muted-foreground">
                  {spendable.basisLabel}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* 3. KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title={
            tax
              ? t("dashboard.revenueTitleYear", { year: tax.tax_year })
              : t("dashboard.revenueTitle")
          }
          description={
            overview.status === "error"
              ? t("dashboard.loadFailed")
              : t("dashboard.revenueDescription")
          }
          value={taxValue((d) => formatEuro(d.totals.revenue_excl_vat))}
          trendLabel={
            overview.status === "ready"
              ? t("dashboard.revenueTrend", {
                  profit: formatEuro(tax.totals.profit),
                  expenses: formatEuro(tax.totals.expenses_excl_vat),
                })
              : undefined
          }
          trendDirection="neutral"
          icon={<Wallet className="size-5" />}
          iconColor="primary"
          variant="elevated"
        />

        <Card
          title={t("dashboard.openTitle")}
          description={
            invoices.status === "error"
              ? t("dashboard.loadFailed")
              : invoices.status === "loading"
                ? t("dashboard.openDescription")
                : openInvoices.count === 0
                  ? t("dashboard.openNone")
                  : t(
                      openInvoices.count === 1
                        ? "dashboard.openCountOne"
                        : "dashboard.openCount",
                      { count: openInvoices.count },
                    )
          }
          value={
            invoices.status === "ready" ? formatEuro(openInvoices.total) : "—"
          }
          trendLabel={
            openInvoices.overdueCount > 0
              ? t("dashboard.openOverdue", {
                  count: openInvoices.overdueCount,
                })
              : undefined
          }
          trendDirection="down"
          icon={<FileText className="size-5" />}
          iconColor="amber"
          variant="elevated"
        />

        <Card
          title={t("dashboard.clientsTitle")}
          description={
            clients.status === "error"
              ? t("dashboard.loadFailed")
              : t("dashboard.clientsDescription")
          }
          value={
            clients.status === "ready"
              ? t(
                  clientList.length === 1
                    ? "dashboard.clientCountOne"
                    : "dashboard.clientCount",
                  { count: clientList.length },
                )
              : "—"
          }
          icon={<Users className="size-5" />}
          iconColor="blue"
          variant="elevated"
        />

        <Link href="/invoices" className="contents">
          <Card
            title={t("dashboard.quickTitle")}
            description={t("dashboard.quickDescription")}
            interactive
            variant="elevated"
            footer={t("dashboard.quickFooter")}
            footerActions={
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold hover:bg-primary/10 transition-all">
                {t("dashboard.start")}{" "}
                <ArrowUpRight className="size-3.5 ml-1" />
              </span>
            }
          >
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t("dashboard.quickText")}
            </p>
          </Card>
        </Link>
      </div>

      {/* 4. Recent invoices & BTW vault */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card
            title={t("dashboard.recentTitle")}
            description={t("dashboard.recentDescription")}
            variant="elevated"
            footerActions={
              <Link href="/invoices">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs font-medium active:scale-[0.97]"
                >
                  {t("dashboard.viewAll")}
                </Button>
              </Link>
            }
          >
            {invoices.status === "error" ? (
              <SectionError
                title={t("dashboard.invoicesLoadFailed")}
                error={invoices.error}
                onRetry={loadDashboard}
              />
            ) : invoices.status === "loading" ? (
              <SkeletonRows />
            ) : recentInvoices.length === 0 ? (
              <EmptyState
                title={t("dashboard.noInvoicesTitle")}
                text={t("dashboard.noInvoicesText")}
              />
            ) : (
              <div className="divide-y divide-border/40">
                {recentInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-muted/20 transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {inv.client_name ||
                          clientNames.get(inv.client_id) ||
                          (clients.status === "loading"
                            ? "—"
                            : t("dashboard.unknownClient"))}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {inv.invoice_number}
                        {inv.due_date &&
                          ` · ${t("dashboard.dueOn", { date: formatDate(inv.due_date) })}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-sm font-bold text-foreground font-mono tabular-nums">
                        {inv.total_cents != null
                          ? formatEuro(inv.total_cents / 100)
                          : "—"}
                      </span>
                      <InvoiceStatusBadge
                        status={isOverdue(inv, today) ? "OVERDUE" : inv.status}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card
          title={t("dashboard.vatTitle")}
          description={
            currentPeriod
              ? t("dashboard.vatReturn", { period: currentPeriod.label })
              : t("dashboard.vatCurrentPeriod")
          }
          variant="elevated"
          badge={
            currentPeriod
              ? currentPeriod.is_estimate
                ? t("dashboard.vatOngoing")
                : t("dashboard.vatToFile")
              : undefined
          }
          badgeVariant={currentPeriod?.is_estimate ? "success" : "warning"}
          badgeDot={Boolean(currentPeriod)}
          footer={t("dashboard.vatFooter")}
          footerActions={
            <Link href="/tax-vault">
              <Button
                size="sm"
                variant="outline"
                className="rounded-full text-xs font-semibold shadow-2xs active:scale-[0.97]"
              >
                {t("dashboard.details")}
              </Button>
            </Link>
          }
        >
          {overview.status === "error" ? (
            <SectionError
              title={t("dashboard.vatLoadFailed")}
              error={overview.error}
              onRetry={loadDashboard}
            />
          ) : isLoading ? (
            <SkeletonRows rows={3} />
          ) : !tax.vat?.enabled ? (
            <EmptyState
              title={t("dashboard.korTitle")}
              text={t("dashboard.korText")}
            />
          ) : !currentPeriod ? (
            <EmptyState
              title={t("dashboard.noOpenPeriodTitle")}
              text={t("dashboard.noOpenPeriodText")}
            />
          ) : (
            <VatPeriodSummary period={currentPeriod} />
          )}
        </Card>
      </div>
    </div>
  );
}

function VatPeriodSummary({ period }) {
  const t = useT();
  const vatHigh = rubriekVat(period, "1a");
  const vatLow = rubriekVat(period, "1b");
  const isRefund = period.balance < 0;
  return (
    <div className="space-y-4 py-2">
      <div>
        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono tabular-nums">
          {formatEuro(Math.abs(period.balance))}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isRefund ? t("dashboard.vatRefund") : t("dashboard.vatToPay")}
          {period.is_estimate ? ` ${t("dashboard.vatEstimate")}` : ""}
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2 text-xs font-mono">
        {vatHigh !== null && (
          <SummaryRow
            label={t("dashboard.vatHigh")}
            value={formatEuro(vatHigh)}
          />
        )}
        {vatLow !== null && (
          <SummaryRow
            label={t("dashboard.vatLow")}
            value={formatEuro(vatLow)}
          />
        )}
        <SummaryRow
          label={t("dashboard.inputVat")}
          value={`− ${formatEuro(period.input_vat)}`}
        />
      </div>

      <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
        <span>
          {t("dashboard.vatDeadline", { date: formatDate(period.deadline) })}
        </span>
      </div>
    </div>
  );
}

const INVOICE_STATUS_STYLES = {
  PAID: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  SENT: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  OVERDUE: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  DRAFT: "border-border/60 bg-muted/40 text-muted-foreground",
  CANCELLED: "border-border/40 bg-muted/20 text-muted-foreground line-through",
};

function InvoiceStatusBadge({ status }) {
  const t = useT();
  if (!INVOICE_STATUS_STYLES[status]) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${INVOICE_STATUS_STYLES[status]}`}
    >
      {t(`dashboard.invoiceStatus.${status}`)}
    </span>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-bold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function SkeletonRows({ rows = RECENT_INVOICES_LIMIT }) {
  return (
    <div className="space-y-3 py-2 animate-pulse">
      {Array.from({ length: rows }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <div key={i} className="space-y-1.5 px-2">
          <div className="h-3.5 w-40 rounded bg-muted" />
          <div className="h-2.5 w-24 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="py-10 px-6 text-center space-y-1">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">{text}</p>
    </div>
  );
}

function SectionError({ title, error, onRetry }) {
  const t = useT();
  const isUnavailable = error?.status === 0 || error?.status === 404;
  return (
    <div className="py-8 px-4 text-center flex flex-col items-center gap-2">
      <div className="flex size-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
        <ServerCrash className="size-5" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground max-w-sm">
        {isUnavailable ? t("dashboard.serverUnavailable") : error?.message}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="mt-1 rounded-full text-xs"
      >
        <RefreshCw />
        {t("dashboard.retry")}
      </Button>
    </div>
  );
}
