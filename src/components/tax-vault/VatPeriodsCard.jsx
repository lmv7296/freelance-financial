"use client";

import { ChevronDown, Percent } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { formatDutchDate } from "@/lib/dateUtils";
import { formatEuro } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";

const PERIOD_STATUS = {
  open: {
    label: "Loopt nog",
    className:
      "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25",
  },
  to_file: {
    label: "Aangifte doen",
    className:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25",
  },
  filed: {
    label: "Aangegeven",
    className: "bg-muted text-muted-foreground border-border/60",
  },
  paid: {
    label: "Betaald",
    className:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  },
};

/**
 * BTW per filing period, with the rubrieken of the official return per period.
 */
export function VatPeriodsCard({ vat }) {
  const [expandedKey, setExpandedKey] = useState(null);

  return (
    <Card
      variant="outlined"
      title="Btw per aangifteperiode"
      description="Verschuldigde btw (5a) min voorbelasting (5b), per rubriek zoals op de aangifte"
      icon={<Percent className="size-5" />}
      iconColor="violet"
      contentClassName="px-0 pb-0"
    >
      {!vat?.enabled ? (
        <p className="px-5 pb-5 text-xs text-muted-foreground">
          Je gebruikt de kleineondernemersregeling (KOR): je rekent geen btw en
          doet geen btw-aangifte.
        </p>
      ) : vat.periods.length === 0 ? (
        <p className="px-5 pb-5 text-xs text-muted-foreground">
          Nog geen aangifteperiodes voor dit jaar.
        </p>
      ) : (
        <ul className="divide-y divide-border/50 border-t border-border/50">
          {vat.periods.map((period) => {
            const isExpanded = expandedKey === period.key;
            const status = PERIOD_STATUS[period.status] ?? PERIOD_STATUS.open;
            const isRefund = period.balance < 0;
            return (
              <li key={period.key}>
                <button
                  type="button"
                  onClick={() => setExpandedKey(isExpanded ? null : period.key)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {period.label}
                      </p>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          status.className,
                        )}
                      >
                        {status.label}
                      </span>
                      {period.is_estimate && (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          schatting
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Uiterlijk {formatDutchDate(period.deadline)} aangeven en
                      betalen
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-mono text-sm font-bold tabular-nums",
                        isRefund
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground",
                      )}
                    >
                      {formatEuro(Math.abs(period.balance))}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {isRefund ? "terug te krijgen" : "te betalen"}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180",
                    )}
                  />
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4">
                    <table className="w-full text-xs">
                      <thead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <tr className="border-b border-border/50">
                          <th className="py-2 pr-2 text-left w-10">Rubriek</th>
                          <th className="py-2 pr-2 text-left">Omschrijving</th>
                          <th className="py-2 pr-2 text-right">Omzet</th>
                          <th className="py-2 text-right">Btw</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {period.rubrieken.map((r) => (
                          <tr key={r.code}>
                            <td className="py-1.5 pr-2 font-mono font-semibold">
                              {r.code}
                            </td>
                            <td className="py-1.5 pr-2 text-muted-foreground">
                              {r.label}
                            </td>
                            <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                              {r.turnover === null
                                ? ""
                                : formatEuro(r.turnover)}
                            </td>
                            <td className="py-1.5 text-right font-mono tabular-nums">
                              {r.vat === null ? "" : formatEuro(r.vat)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border font-semibold">
                          <td />
                          <td className="py-2 pr-2">
                            {isRefund ? "Terug te ontvangen" : "Te betalen"} (5a
                            − 5b)
                          </td>
                          <td />
                          <td className="py-2 text-right font-mono tabular-nums">
                            {formatEuro(period.balance)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default VatPeriodsCard;
