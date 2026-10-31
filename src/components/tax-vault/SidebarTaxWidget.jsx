"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { taxVaultApi } from "@/lib/api/taxVault";
import { formatDutchDate, parseLocalDate } from "@/lib/dateUtils";
import { formatEuro } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";

// Show the deadline in warning colors when it's this close
const DUE_SOON_DAYS = 14;

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (parseLocalDate(dateStr).getTime() - today.getTime()) / 86_400_000,
  );
}

/**
 * Compact Tax Vault summary for the sidebar: next BTW return and monthly set-aside advice.
 * Shows no figures when the backend can't provide them.
 */
export function SidebarTaxWidget() {
  const [overview, setOverview] = useState(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    taxVaultApi
      .getOverview()
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const nextPeriod = overview?.vat?.periods?.find(
    (p) => p.status === "open" || p.status === "to_file",
  );
  const days = nextPeriod ? daysUntil(nextPeriod.deadline) : null;
  const isDueSoon = days !== null && days <= DUE_SOON_DAYS;
  const isRefund = nextPeriod && nextPeriod.balance < 0;

  return (
    <Link
      href="/tax-vault"
      className="group mx-1 block rounded-2xl border border-border/70 dark:border-white/[0.08] bg-muted/40 p-3 space-y-1.5 hover:bg-muted/70 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-foreground truncate">
          {nextPeriod ? `Btw ${nextPeriod.label}` : "Belastingkluis"}
        </span>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </div>

      {hasError ? (
        <p className="text-[10px] text-muted-foreground leading-tight">
          Schattingen nog niet beschikbaar.
        </p>
      ) : !overview ? (
        <div className="space-y-1.5 animate-pulse">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-2.5 w-28 rounded bg-muted" />
        </div>
      ) : (
        <>
          {nextPeriod ? (
            <>
              <p
                className={cn(
                  "font-mono text-sm font-bold tabular-nums",
                  isRefund
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground",
                )}
              >
                {formatEuro(Math.abs(nextPeriod.balance))}
                <span className="ml-1 font-sans text-[10px] font-medium text-muted-foreground">
                  {isRefund ? "terug" : "te betalen"}
                </span>
              </p>
              <p
                className={cn(
                  "text-[10px] leading-tight",
                  isDueSoon
                    ? "font-semibold text-amber-700 dark:text-amber-300"
                    : "text-muted-foreground",
                )}
              >
                Uiterlijk {formatDutchDate(nextPeriod.deadline)}
                {days !== null && days >= 0 && ` (nog ${days} d)`}
                {days !== null && days < 0 && " (te laat)"}
              </p>
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground leading-tight">
              {overview.vat?.enabled
                ? "Geen open btw-periode."
                : "Geen btw-aangifte (KOR)."}
            </p>
          )}
          {overview.set_aside && (
            <p className="border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground leading-tight">
              Zet{" "}
              <span className="font-mono font-semibold text-foreground">
                {formatEuro(overview.set_aside.monthly_amount)}
              </span>{" "}
              per maand opzij
            </p>
          )}
        </>
      )}
    </Link>
  );
}

export default SidebarTaxWidget;
