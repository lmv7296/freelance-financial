"use client";

import {
  BarChart3,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Percent,
  Receipt,
  ServerCrash,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  FORMAT_LABELS,
  ReportDownloadModal,
} from "@/components/reports/ReportDownloadModal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { reportsApi } from "@/lib/api/reports";
import { useT } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

/**
 * The reports the page offers. Titles, descriptions and contents come from the
 * dictionaries (reports.types.<key>); which formats exist comes from the backend.
 * VAT returns are per month, quarter or year, so the VAT summary has no custom dates.
 */
const REPORTS = [
  {
    key: "profit_loss",
    icon: TrendingUp,
    iconColor: "emerald",
    periodTypes: ["quarter", "month", "year", "custom"],
  },
  {
    key: "vat_summary",
    icon: Percent,
    iconColor: "blue",
    periodTypes: ["quarter", "month", "year"],
  },
  {
    key: "invoices",
    icon: FileSpreadsheet,
    iconColor: "violet",
    periodTypes: ["quarter", "month", "year", "custom"],
  },
  {
    key: "expenses",
    icon: Receipt,
    iconColor: "amber",
    periodTypes: ["quarter", "month", "year", "custom"],
  },
];

const INCLUDES_COUNT = 3;

export default function ReportsPage() {
  const t = useT();
  const [options, setOptions] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [openKey, setOpenKey] = useState(null);
  const [lastDownload, setLastDownload] = useState(null);

  const loadOptions = useCallback(async () => {
    setLoadError(null);
    try {
      setOptions(await reportsApi.getOptions());
    } catch (err) {
      setLoadError(err);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const formatsFor = (key) =>
    options?.reports.find((r) => r.key === key)?.formats ?? [];
  const openReport = REPORTS.find((r) => r.key === openKey);

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 space-y-6 font-sans">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border border-border bg-muted text-muted-foreground">
          <BarChart3 className="size-3" />
          {t("reports.badge")}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
          {t("reports.title")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {t("reports.subtitle")}
        </p>
      </div>

      {loadError && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-800 dark:text-rose-200">
          <ServerCrash className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-semibold">
              {loadError.status === 404
                ? t("reports.notAvailable")
                : t("reports.loadFailed")}
            </p>
            {loadError.status !== 404 && loadError.message && (
              <p className="mt-0.5 opacity-80">{loadError.message}</p>
            )}
          </div>
          <Button size="xs" variant="outline" onClick={loadOptions}>
            {t("reports.retry")}
          </Button>
        </div>
      )}

      {lastDownload && (
        <output className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="size-4 shrink-0" />
          {t("reports.downloaded", { filename: lastDownload })}
        </output>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {REPORTS.map((report) => {
          const formats = formatsFor(report.key);
          const isAvailable = formats.length > 0;
          return (
            // The whole card is the button. The "Rapport downloaden" label inside
            // only looks like a button, so there's no button inside a button.
            <button
              key={report.key}
              type="button"
              onClick={() => {
                setLastDownload(null);
                setOpenKey(report.key);
              }}
              disabled={!isAvailable}
              className="group/report rounded-2xl text-left cursor-pointer outline-none transition-transform active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-default disabled:active:scale-100"
            >
              <Card
                variant="outlined"
                title={t(`reports.types.${report.key}.title`)}
                description={t(`reports.types.${report.key}.description`)}
                icon={<report.icon className="size-5" />}
                iconColor={report.iconColor}
                className={cn(
                  "h-full",
                  isAvailable &&
                    "group-hover/report:-translate-y-0.5 group-hover/report:border-primary/50! group-hover/report:bg-muted/40 group-hover/report:shadow-md!",
                )}
              >
                <ul className="space-y-1.5">
                  {Array.from({ length: INCLUDES_COUNT }, (_, i) => (
                    <li
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed list from the dictionary
                      key={i}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
                      {t(`reports.types.${report.key}.includes.${i}`)}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground">
                    {!options && !loadError ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : isAvailable ? (
                      formats.map((f) => FORMAT_LABELS[f] || f).join(" · ")
                    ) : (
                      t("reports.reportNotAvailable")
                    )}
                  </span>
                  <span
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      isAvailable
                        ? "group-hover/report:bg-primary/85 group-hover/report:shadow-md"
                        : "opacity-50",
                    )}
                  >
                    <Download />
                    {t("reports.download")}
                  </span>
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      {openReport && (
        <ReportDownloadModal
          key={openReport.key}
          report={openReport}
          formats={formatsFor(openReport.key)}
          years={options?.available_years ?? []}
          onClose={() => setOpenKey(null)}
          onDownloaded={(filename) => {
            setOpenKey(null);
            setLastDownload(filename);
          }}
        />
      )}
    </div>
  );
}
