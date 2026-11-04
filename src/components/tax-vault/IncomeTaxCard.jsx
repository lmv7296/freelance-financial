"use client";

import { Landmark } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { formatEuro } from "@/lib/formatCurrency";
import { localeFor } from "@/lib/i18n/dictionaries";
import { usePreferences } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

const STEP_STYLES = {
  income: "text-foreground",
  deduction: "text-emerald-700 dark:text-emerald-400",
  credit: "text-emerald-700 dark:text-emerald-400",
  subtotal: "font-semibold text-foreground border-t border-border/60",
  tax: "text-rose-700 dark:text-rose-400",
  total: "font-bold text-foreground border-t-2 border-border",
};

function formatPercent(value, language) {
  return `${(value * 100).toLocaleString(localeFor(language), { maximumFractionDigits: 1 })}%`;
}

/**
 * Income tax estimate (IB + Zvw for an eenmanszaak; VPB for a BV later).
 * Renders the calculation steps returned by the backend, so it works for any legal form.
 */
export function IncomeTaxCard({ estimate, rulesByKey, onShowRule }) {
  const { t, language } = usePreferences();
  const [scenarioKey, setScenarioKey] = useState("projected");

  if (!estimate || estimate.status !== "available") {
    return (
      <Card
        variant="outlined"
        title={t("taxVault.incomeTax.title")}
        icon={<Landmark className="size-5" />}
        iconColor="blue"
      >
        <p className="text-xs text-muted-foreground">
          {t("taxVault.incomeTax.unavailable")}
        </p>
      </Card>
    );
  }

  const scenario =
    estimate[scenarioKey] ?? estimate.projected ?? estimate.to_date;
  const scenarios = [
    { key: "projected", label: t("taxVault.incomeTax.projected") },
    { key: "to_date", label: t("taxVault.incomeTax.toDate") },
  ].filter((s) => estimate[s.key]);

  return (
    <Card
      variant="outlined"
      title={estimate.label}
      description={scenario.basis_label}
      icon={<Landmark className="size-5" />}
      iconColor="blue"
      headerAction={
        scenarios.length > 1 && (
          <div className="flex rounded-full border border-border/60 bg-muted/50 p-0.5">
            {scenarios.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setScenarioKey(s.key)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer",
                  scenarioKey === s.key
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )
      }
    >
      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          label={t("taxVault.incomeTax.profit")}
          value={formatEuro(scenario.profit)}
        />
        <Metric
          label={t("taxVault.incomeTax.totalTax")}
          value={formatEuro(scenario.total_tax)}
        />
        <Metric
          label={t("taxVault.incomeTax.paid")}
          value={formatEuro(scenario.provisional_assessment_paid)}
        />
        <Metric
          label={t("taxVault.incomeTax.stillToPay")}
          value={formatEuro(scenario.still_to_pay)}
          highlight
        />
      </div>

      {scenario.components.length > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {scenario.components
            .map((c) => `${c.label} ${formatEuro(c.amount)}`)
            .join(" • ")}{" "}
          •{" "}
          {t("taxVault.incomeTax.effectiveRate", {
            rate: formatPercent(scenario.effective_rate, language),
          })}
        </p>
      )}

      {/* Calculation steps */}
      <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-2">
        <p className="py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("taxVault.incomeTax.howCalculated")}
        </p>
        <ul className="text-xs">
          {scenario.steps.map((step) => {
            const rule = step.rule_key ? rulesByKey[step.rule_key] : null;
            return (
              <li
                key={step.key}
                className={cn(
                  "flex items-baseline justify-between gap-3 py-1.5",
                  STEP_STYLES[step.kind],
                )}
              >
                <span className="min-w-0">
                  {step.label}
                  {rule && (
                    <button
                      type="button"
                      onClick={() => onShowRule?.(rule.key)}
                      className="ml-1.5 rounded px-1 text-[10px] font-medium text-primary hover:underline cursor-pointer"
                    >
                      {rule.display_value}
                    </button>
                  )}
                  {step.note && (
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      {step.note}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-mono tabular-nums">
                  {formatEuro(step.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {scenarioKey === "projected" && estimate.projection_method && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {t("taxVault.incomeTax.projectionMethod", {
            method: estimate.projection_method,
          })}
        </p>
      )}
    </Card>
  );
}

function Metric({ label, value, highlight = false }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-muted/30 p-3",
        highlight && "border-primary/30 bg-primary/5",
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

export default IncomeTaxCard;
