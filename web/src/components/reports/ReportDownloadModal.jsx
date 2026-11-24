"use client";

import { Download, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { reportsApi } from "@/lib/api/reports";
import { usePreferences } from "@/lib/preferences/PreferencesContext";
import {
  defaultPeriod,
  formatRange,
  monthNames,
  periodRange,
} from "@/lib/reports/periods";
import { cn } from "@/lib/utils";

const fieldClassName =
  "flex h-9.5 w-full rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground shadow-2xs focus-visible:border-primary/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20";

const labelClassName = "text-[11px] font-medium text-muted-foreground";

export const FORMAT_LABELS = { pdf: "PDF", xlsx: "Excel (.xlsx)" };

/**
 * Asks for the period and format of a report, shows exactly what will be downloaded
 * and only starts the download after the user confirms.
 * Mount it with a `key` per report so the choices reset when another report opens.
 */
export function ReportDownloadModal({
  report,
  formats,
  years,
  onClose,
  onDownloaded,
}) {
  const { t, language } = usePreferences();
  const ids = {
    type: useId(),
    year: useId(),
    month: useId(),
    quarter: useId(),
    from: useId(),
    to: useId(),
  };
  const [period, setPeriod] = useState(defaultPeriod);
  const [format, setFormat] = useState(formats[0]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);

  const range = periodRange(period);
  const reportTitle = t(`reports.types.${report.key}.title`);
  const update = (changes) => {
    setPeriod((prev) => ({ ...prev, ...changes }));
    setError(null);
  };

  // The current year is always offered, also before there is any data in it
  const yearOptions = [...new Set([period.year, ...years])].sort(
    (a, b) => b - a,
  );

  const handleDownload = async () => {
    if (!range) return;
    setIsDownloading(true);
    setError(null);
    try {
      const { filename } = await reportsApi.download(report.key, {
        format,
        ...range,
        lang: language,
      });
      onDownloaded?.(filename);
    } catch (err) {
      setError(
        err?.status === 404
          ? t("reports.notAvailable")
          : err?.message || t("reports.downloadFailed"),
      );
      setIsDownloading(false);
    }
  };

  return (
    <Modal isOpen onClose={isDownloading ? undefined : onClose} maxWidth="lg">
      <ModalHeader
        title={reportTitle}
        description={t("reports.modal.description")}
        icon={<report.icon className="size-5" />}
      />
      <ModalBody>
        <fieldset disabled={isDownloading} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor={ids.type} className={labelClassName}>
              {t("reports.modal.period")}
            </label>
            <select
              id={ids.type}
              value={period.type}
              onChange={(e) => update({ type: e.target.value })}
              className={fieldClassName}
            >
              {report.periodTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`reports.periodTypes.${type}`)}
                </option>
              ))}
            </select>
          </div>

          {period.type === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor={ids.from} className={labelClassName}>
                  {t("reports.modal.from")}
                </label>
                <input
                  id={ids.from}
                  type="date"
                  value={period.from}
                  max={period.to || undefined}
                  onChange={(e) => update({ from: e.target.value })}
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor={ids.to} className={labelClassName}>
                  {t("reports.modal.to")}
                </label>
                <input
                  id={ids.to}
                  type="date"
                  value={period.to}
                  min={period.from || undefined}
                  onChange={(e) => update({ to: e.target.value })}
                  className={fieldClassName}
                />
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-3",
                period.type === "year" ? "grid-cols-1" : "grid-cols-2",
              )}
            >
              {period.type === "month" && (
                <div className="space-y-1">
                  <label htmlFor={ids.month} className={labelClassName}>
                    {t("reports.modal.month")}
                  </label>
                  <select
                    id={ids.month}
                    value={period.month}
                    onChange={(e) => update({ month: Number(e.target.value) })}
                    className={fieldClassName}
                  >
                    {monthNames(language).map((name, i) => (
                      <option key={name} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {period.type === "quarter" && (
                <div className="space-y-1">
                  <label htmlFor={ids.quarter} className={labelClassName}>
                    {t("reports.modal.quarter")}
                  </label>
                  <select
                    id={ids.quarter}
                    value={period.quarter}
                    onChange={(e) =>
                      update({ quarter: Number(e.target.value) })
                    }
                    className={fieldClassName}
                  >
                    {[1, 2, 3, 4].map((q) => (
                      <option key={q} value={q}>
                        {t("reports.modal.quarterOption", { quarter: q })}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <label htmlFor={ids.year} className={labelClassName}>
                  {t("reports.modal.year")}
                </label>
                <select
                  id={ids.year}
                  value={period.year}
                  onChange={(e) => update({ year: Number(e.target.value) })}
                  className={fieldClassName}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <p className={labelClassName}>{t("reports.modal.format")}</p>
            <div className="flex flex-wrap gap-2">
              {formats.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormat(key)}
                  aria-pressed={format === key}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    format === key
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/70 text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {FORMAT_LABELS[key] || key.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* The confirmation: exactly what will be downloaded */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
            <p className="text-xs font-semibold text-foreground">
              {t("reports.modal.confirmTitle")}
            </p>
            {range ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("reports.modal.confirmText", {
                  report: reportTitle,
                  period: formatRange(range, language),
                  format: FORMAT_LABELS[format] || format,
                })}
              </p>
            ) : (
              <p className="mt-1 text-xs text-destructive">
                {t("reports.modal.invalidRange")}
              </p>
            )}
          </div>
        </fieldset>
      </ModalBody>
      <ModalFooter>
        {error && (
          <span role="alert" className="mr-auto text-xs text-destructive">
            {error}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isDownloading}
        >
          {t("reports.modal.cancel")}
        </Button>
        <Button
          size="sm"
          onClick={handleDownload}
          disabled={isDownloading || !range || !format}
        >
          {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
          {isDownloading
            ? t("reports.modal.downloading")
            : t("reports.modal.confirm")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ReportDownloadModal;
