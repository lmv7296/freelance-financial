"use client";

import {
  ChevronRight,
  ClipboardCheck,
  FileText,
  Loader2,
  MessageCircle,
  Receipt,
  RefreshCw,
  Search,
  ServerCrash,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExpenseDetailModal } from "@/components/expenses/ExpenseDetailModal";
import {
  EXPENSE_STATUS_META,
  ExpenseStatusChip,
} from "@/components/expenses/ExpenseStatusChip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { expensesApi } from "@/lib/api/expenses";
import { formatDutchDate, parseLocalDate } from "@/lib/dateUtils";
import { formatCurrency, formatEuro } from "@/lib/formatCurrency";

// While receipts are still being read by the backend, refresh the list periodically
const PROCESSING_POLL_MS = 10_000;

const STATUS_FILTERS = ["all", ...Object.keys(EXPENSE_STATUS_META)];

function isSameMonth(dateStr, now) {
  if (!dateStr) return false;
  const d = parseLocalDate(dateStr);
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

function isSameQuarter(dateStr, now) {
  if (!dateStr) return false;
  const d = parseLocalDate(dateStr);
  return (
    d.getFullYear() === now.getFullYear() &&
    Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3)
  );
}

function isImage(expense) {
  if (expense.receipt_content_type) {
    return expense.receipt_content_type.startsWith("image/");
  }
  return !/\.pdf($|\?)/i.test(expense.receipt_url || "");
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const loadExpenses = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
      setLoadError(null);
    }
    try {
      const res = await expensesApi.list();
      setExpenses(res?.expenses ?? []);
      setLoadError(null);
    } catch (err) {
      // On background refreshes keep the data we already have
      if (!silent) setLoadError(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const hasProcessing = expenses.some((e) => e.status === "processing");

  useEffect(() => {
    if (!hasProcessing) return;
    const interval = setInterval(
      () => loadExpenses({ silent: true }),
      PROCESSING_POLL_MS,
    );
    return () => clearInterval(interval);
  }, [hasProcessing, loadExpenses]);

  const filteredExpenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return expenses.filter((e) => {
      const matchesFilter = activeFilter === "all" || e.status === activeFilter;
      if (!matchesFilter) return false;
      if (!query) return true;
      return [
        e.merchant_name,
        e.category,
        e.sender_name,
        e.sender_phone,
        e.client_name,
        e.invoice_number,
        e.notes,
      ].some((v) => v?.toLowerCase().includes(query));
    });
  }, [expenses, activeFilter, searchQuery]);

  const stats = useMemo(() => {
    const now = new Date();
    const counted = expenses.filter((e) => e.status !== "rejected");
    const sum = (list, key) => list.reduce((acc, e) => acc + (e[key] ?? 0), 0);
    const thisMonth = counted.filter((e) =>
      isSameMonth(e.receipt_date || e.created_at, now),
    );
    const toReview = expenses.filter((e) => e.status === "needs_review");
    const approvedThisQuarter = expenses.filter(
      (e) =>
        e.status === "approved" &&
        isSameQuarter(e.receipt_date || e.created_at, now),
    );
    return {
      monthTotal: sum(thisMonth, "total_amount"),
      monthCount: thisMonth.length,
      reviewCount: toReview.length,
      reviewTotal: sum(toReview, "total_amount"),
      quarterVat: sum(approvedThisQuarter, "vat_amount"),
      quarterNumber: Math.floor(now.getMonth() / 3) + 1,
      processingCount: expenses.filter((e) => e.status === "processing").length,
    };
  }, [expenses]);

  const categoryOptions = useMemo(
    () => [...new Set(expenses.map((e) => e.category).filter(Boolean))].sort(),
    [expenses],
  );

  const selectedExpense = expenses.find((e) => e.id === selectedId) ?? null;

  const handleUpdated = (updated) => {
    setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  const handleDeleted = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setSelectedId(null);
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <Receipt className="size-3" />
              Uitgaven & Bonnetjes
            </span>
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
              <MessageCircle className="size-3" />
              via WhatsApp
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Uitgaven
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Bonnetjes die via WhatsApp zijn ingestuurd worden automatisch
            uitgelezen. Controleer, corrigeer en keur ze hier goed.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => loadExpenses({ silent: true })}
          disabled={isLoading || isRefreshing}
          className="rounded-full px-4 shadow-2xs text-xs h-9 self-start sm:self-auto"
        >
          <RefreshCw
            className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Vernieuwen
        </Button>
      </div>

      {/* 2. Key metrics, all computed from backend data */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Uitgaven deze maand"
          description={`${stats.monthCount} bonnetjes (excl. afgekeurd)`}
          value={isLoading ? "—" : formatEuro(stats.monthTotal)}
          icon={<Wallet className="size-5" />}
          iconColor="primary"
        />
        <Card
          title="Te controleren"
          description={`${formatEuro(stats.reviewTotal)} in afwachting`}
          value={isLoading ? "—" : stats.reviewCount}
          icon={<ClipboardCheck className="size-5" />}
          iconColor="amber"
        />
        <Card
          title={`Terug te vragen BTW Q${stats.quarterNumber}`}
          description="Van goedgekeurde bonnetjes"
          value={isLoading ? "—" : formatEuro(stats.quarterVat)}
          icon={<FileText className="size-5" />}
          iconColor="emerald"
        />
        <Card
          title="Wordt verwerkt"
          description="Bonnetjes die nog worden uitgelezen"
          value={isLoading ? "—" : stats.processingCount}
          icon={<Loader2 className="size-5" />}
          iconColor="blue"
        />
      </div>

      {/* 3. Filters & search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {STATUS_FILTERS.map((filter) => {
            const count =
              filter === "all"
                ? expenses.length
                : expenses.filter((e) => e.status === filter).length;
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.96] cursor-pointer ${
                  isActive
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
                }`}
              >
                <span>
                  {filter === "all"
                    ? "Alle uitgaven"
                    : EXPENSE_STATUS_META[filter].label}
                </span>
                <span
                  className={`rounded-full px-1.5 text-[10px] font-mono ${
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

        <div className="relative w-full sm:w-72">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek winkel, categorie of afzender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9.5 h-9 text-xs rounded-full border-border/70 dark:border-white/[0.08]"
          />
        </div>
      </div>

      {/* 4. Expenses table */}
      <Card
        variant="outlined"
        className="overflow-hidden border border-border/70 dark:border-white/[0.08] shadow-xs bg-card/90"
      >
        {loadError ? (
          <ErrorState error={loadError} onRetry={() => loadExpenses()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-5">Bonnetje</th>
                  <th className="py-3 px-5">Datum</th>
                  <th className="py-3 px-5">Ingestuurd door</th>
                  <th className="py-3 px-5">Gekoppeld aan</th>
                  <th className="py-3 px-5 text-right">Bedrag</th>
                  <th className="py-3 px-5 text-center">Status</th>
                  <th className="py-3 px-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {isLoading ? (
                  <SkeletonRows />
                ) : filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      onOpen={() => setSelectedId(expense.id)}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState hasAnyExpenses={expenses.length > 0} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 5. Detail modal: receipt + extracted data */}
      {selectedExpense && (
        <ExpenseDetailModal
          key={`${selectedExpense.id}-${selectedExpense.updated_at}`}
          expense={selectedExpense}
          isOpen
          onClose={() => setSelectedId(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
          categoryOptions={categoryOptions}
        />
      )}
    </div>
  );
}

function ExpenseRow({ expense, onOpen }) {
  const currency = expense.currency || "EUR";
  const isProcessing = expense.status === "processing";

  return (
    <tr
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      className="hover:bg-muted/30 focus-visible:bg-muted/40 focus-visible:outline-hidden transition-colors group cursor-pointer"
    >
      {/* Receipt thumbnail, merchant & category */}
      <td className="py-3 px-5">
        <div className="flex items-center gap-3">
          <div className="size-10 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted flex items-center justify-center text-muted-foreground">
            {isImage(expense) && expense.receipt_url ? (
              // biome-ignore lint/performance/noImgElement: receipt is served by the backend, not optimizable by next/image
              <img
                src={expense.receipt_url}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            ) : (
              <FileText className="size-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {isProcessing
                ? "Wordt uitgelezen..."
                : expense.merchant_name || "Onbekende winkel"}
            </p>
            {expense.category && (
              <span className="mt-0.5 inline-block text-[10px] px-1.5 rounded bg-muted text-muted-foreground font-medium">
                {expense.category}
              </span>
            )}
          </div>
        </div>
      </td>

      <td className="py-3 px-5">
        <p className="font-medium text-foreground whitespace-nowrap">
          {expense.receipt_date ? formatDutchDate(expense.receipt_date) : "—"}
        </p>
        <p className="text-[10px] text-muted-foreground whitespace-nowrap">
          ontvangen {formatDutchDate(expense.created_at)}
        </p>
      </td>

      <td className="py-3 px-5">
        <p className="font-medium text-foreground">
          {expense.sender_name || expense.sender_phone || "—"}
        </p>
        {expense.sender_name && expense.sender_phone && (
          <p className="text-[10px] text-muted-foreground font-mono">
            {expense.sender_phone}
          </p>
        )}
      </td>

      <td className="py-3 px-5">
        {expense.client_name || expense.invoice_number ? (
          <>
            <p className="font-medium text-foreground">
              {expense.client_name || "—"}
            </p>
            {expense.invoice_number && (
              <p className="text-[10px] text-muted-foreground font-mono">
                {expense.invoice_number}
              </p>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">Niet gekoppeld</span>
        )}
      </td>

      <td className="py-3 px-5 text-right">
        <p className="font-mono font-bold text-sm text-foreground tabular-nums">
          {expense.total_amount !== null && expense.total_amount !== undefined
            ? formatCurrency(expense.total_amount, currency)
            : "—"}
        </p>
        {expense.vat_amount !== null && expense.vat_amount !== undefined && (
          <p className="text-[10px] text-muted-foreground font-mono tabular-nums">
            BTW {formatCurrency(expense.vat_amount, currency)}
          </p>
        )}
      </td>

      <td className="py-3 px-5 text-center">
        <ExpenseStatusChip status={expense.status} />
      </td>

      <td className="py-3 px-3 text-right">
        <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      </td>
    </tr>
  );
}

function SkeletonRows() {
  return ["a", "b", "c", "d"].map((key) => (
    <tr key={key}>
      <td colSpan={7} className="py-3 px-5">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="size-10 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-muted" />
            <div className="h-2.5 w-1/5 rounded bg-muted/70" />
          </div>
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
      </td>
    </tr>
  ));
}

function EmptyState({ hasAnyExpenses }) {
  return (
    <div className="py-14 px-6 text-center text-muted-foreground flex flex-col items-center gap-2">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
        <Receipt className="size-5" />
      </div>
      {hasAnyExpenses ? (
        <>
          <p className="text-sm font-medium text-foreground">
            Geen uitgaven gevonden die voldoen aan je filter
          </p>
          <p className="text-xs">Probeer een andere zoekterm of filtertab.</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">
            Nog geen bonnetjes binnengekomen
          </p>
          <p className="text-xs max-w-sm">
            Stuur een foto van een bonnetje naar het WhatsApp-nummer. Het
            verschijnt hier automatisch zodra het is uitgelezen.
          </p>
        </>
      )}
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  const isUnavailable = error?.status === 0 || error?.status === 404;
  return (
    <div className="py-14 px-6 text-center flex flex-col items-center gap-2">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
        <ServerCrash className="size-5" />
      </div>
      <p className="text-sm font-semibold text-foreground">
        {isUnavailable
          ? "Uitgaven zijn nog niet beschikbaar"
          : "Uitgaven konden niet geladen worden"}
      </p>
      <p className="text-xs text-muted-foreground max-w-sm">
        {isUnavailable
          ? "De server voor uitgaven is (nog) niet bereikbaar. Probeer het later opnieuw."
          : error?.message}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="mt-2 rounded-full text-xs"
      >
        <RefreshCw />
        Opnieuw proberen
      </Button>
    </div>
  );
}
