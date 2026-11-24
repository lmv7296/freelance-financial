"use client";

import { ChevronDown, Percent } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/dateUtils";
import { formatEuro } from "@/lib/formatCurrency";
import { useT } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

const PERIOD_STATUS = {
  open: {
    className:
      "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25",
  },
  to_file: {
    className:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25",
  },
  filed: {
    className: "bg-muted text-muted-foreground border-border/60",
  },
  paid: {
    className:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  },
};

/**
 * BTW per filing period, with the rubrieken of the official return per period.
 */
export function VatPeriodsCard({ vat }) {
  const t = useT();
  const [expandedKey, setExpandedKey] = useState(null);

  return (
    <Card
      variant="outlined"
      title={t("taxVault.vat.title")}
      description={t("taxVault.vat.description")}
      icon={<Percent className="size-5" />}
      iconColor="violet"
      contentClassName="px-0 pb-0"
    >
      {!vat?.enabled ? (
        <p className="px-5 pb-5 text-xs text-muted-foreground">
          {t("taxVault.vat.kor")}
        </p>
      ) : vat.periods.length === 0 ? (
        <p className="px-5 pb-5 text-xs text-muted-foreground">
          {t("taxVault.vat.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-border/50 border-t border-border/50">
          {vat.periods.map((period) => {
            const isExpanded = expandedKey === period.key;
            const statusKey = PERIOD_STATUS[period.status]
              ? period.status
              : "open";
            const status = PERIOD_STATUS[statusKey];
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
                        {t(`taxVault.vat.status.${statusKey}`)}
                      </span>
                      {period.is_estimate && (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {t("taxVault.vat.estimate")}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {t("taxVault.vat.deadline", {
                        date: formatDate(period.deadline),
                      })}
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
                      {isRefund
                        ? t("taxVault.vat.refund")
                        : t("taxVault.vat.toPay")}
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
                          <th className="py-2 pr-2 text-left w-10">
                            {t("taxVault.vat.code")}
                          </th>
                          <th className="py-2 pr-2 text-left">
                            {t("taxVault.vat.description_col")}
                          </th>
                          <th className="py-2 pr-2 text-right">
                            {t("taxVault.vat.turnover")}
                          </th>
                          <th className="py-2 text-right">
                            {t("taxVault.vat.vat")}
                          </th>
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
                            {isRefund
                              ? t("taxVault.vat.totalRefund")
                              : t("taxVault.vat.totalToPay")}
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
