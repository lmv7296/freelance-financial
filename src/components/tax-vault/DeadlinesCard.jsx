import { CalendarClock, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDate, parseLocalDate } from "@/lib/dateUtils";
import { formatEuro } from "@/lib/formatCurrency";
import { localeFor } from "@/lib/i18n/dictionaries";
import { usePreferences } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  overdue: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  due_soon:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  upcoming: "border-border/60 bg-muted/40 text-foreground",
  done: "border-border/40 bg-muted/20 text-muted-foreground line-through",
};

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = parseLocalDate(dateStr);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

function relativeLabel(days, t) {
  if (days === 0) return t("taxVault.deadlines.today");
  if (days === 1) return t("taxVault.deadlines.tomorrow");
  if (days > 1) return t("taxVault.deadlines.inDays", { count: days });
  if (days === -1) return t("taxVault.deadlines.oneDayLate");
  return t("taxVault.deadlines.daysLate", { count: Math.abs(days) });
}

/**
 * Upcoming tax deadlines (BTW returns, income tax return, payments)
 */
export function DeadlinesCard({ deadlines = [] }) {
  const { t, language } = usePreferences();
  return (
    <Card
      variant="outlined"
      title={t("taxVault.deadlines.title")}
      description={t("taxVault.deadlines.description")}
      icon={<CalendarClock className="size-5" />}
      iconColor="amber"
    >
      {deadlines.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("taxVault.deadlines.empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {deadlines.map((deadline) => {
            const days = daysUntil(deadline.date);
            const date = parseLocalDate(deadline.date);
            return (
              <li
                key={deadline.key}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-2.5",
                  STATUS_STYLES[deadline.status] ?? STATUS_STYLES.upcoming,
                )}
              >
                <div className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-background/70 py-1 text-center">
                  <span className="text-[9px] font-bold uppercase">
                    {date.toLocaleDateString(localeFor(language), {
                      month: "short",
                    })}
                  </span>
                  <span className="font-mono text-base font-bold leading-none">
                    {date.getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{deadline.label}</p>
                  <p className="text-[10px] opacity-80">
                    {formatDate(deadline.date)}
                    {deadline.status !== "done" &&
                      ` • ${relativeLabel(days, t)}`}
                    {deadline.amount !== null &&
                      ` • ${t("taxVault.deadlines.approx", {
                        amount: formatEuro(deadline.amount),
                      })}`}
                  </p>
                  {deadline.description && (
                    <p className="text-[10px] opacity-70">
                      {deadline.description}
                    </p>
                  )}
                </div>
                {deadline.source_url && (
                  <a
                    href={deadline.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="size-7 shrink-0 flex items-center justify-center rounded-lg opacity-60 hover:bg-background/70 hover:opacity-100"
                    title={t("taxVault.deadlines.source")}
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default DeadlinesCard;
