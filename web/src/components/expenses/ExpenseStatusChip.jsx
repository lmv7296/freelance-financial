import { useT } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

// Styling per backend status value (see ExpenseStatus in src/types/api.d.ts).
// Labels are in the language files: expenses.status.<status>
export const EXPENSE_STATUS_META = {
  processing: {
    chip: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25",
    dot: "bg-blue-500 animate-pulse",
  },
  needs_review: {
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25",
    dot: "bg-amber-500 animate-pulse",
  },
  approved: {
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    dot: "bg-emerald-500",
  },
  rejected: {
    chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25",
    dot: "bg-rose-500",
  },
};

export function ExpenseStatusChip({ status, className }) {
  const t = useT();
  const meta = EXPENSE_STATUS_META[status] || {
    chip: "bg-muted text-muted-foreground border-border/60",
    dot: "bg-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border whitespace-nowrap",
        meta.chip,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {EXPENSE_STATUS_META[status]
        ? t(`expenses.status.${status}`)
        : status || t("expenses.status.unknown")}
    </span>
  );
}

export default ExpenseStatusChip;
