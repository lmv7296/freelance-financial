"use client";

import { Check, Loader2, RefreshCw } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

/**
 * Frame for one settings section: header, body with loading/error states, and an optional
 * save bar driven by a useSettingsResource result.
 */
export function SettingsSection({
  title,
  description,
  icon,
  resource,
  onSave,
  saveBar = true,
  children,
}) {
  const t = useT();
  const showSaveBar =
    saveBar && resource && !resource.isLoading && !resource.loadError;

  return (
    <Card
      variant="outlined"
      title={title}
      description={description}
      icon={icon}
      className="hover:translate-y-0"
      footer={showSaveBar ? <SaveStatus resource={resource} /> : undefined}
      footerActions={
        showSaveBar ? (
          <>
            {resource.isDirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resource.reset}
                disabled={resource.saveState === "saving"}
              >
                {t("settings.common.discard")}
              </Button>
            )}
            <Button
              size="sm"
              onClick={onSave ?? resource.submit}
              disabled={!resource.isDirty || resource.saveState === "saving"}
            >
              {resource.saveState === "saving" && (
                <Loader2 className="animate-spin" />
              )}
              {t("settings.common.save")}
            </Button>
          </>
        ) : undefined
      }
    >
      {resource?.loadError ? (
        <SectionError error={resource.loadError} onRetry={resource.reload} />
      ) : resource?.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-5">{children}</div>
      )}
    </Card>
  );
}

function SaveStatus({ resource }) {
  const t = useT();
  if (resource.saveState === "saved") {
    return (
      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <Check className="size-3.5" />
        {t("settings.common.saved")}
      </span>
    );
  }
  if (resource.saveState === "error") {
    return (
      <span className="text-destructive">
        {resource.saveError?.message || t("settings.common.saveFailed")}
      </span>
    );
  }
  if (resource.isDirty) {
    return <span>{t("settings.common.unsaved")}</span>;
  }
  return null;
}

export function SectionError({ error, onRetry }) {
  const t = useT();
  const isUnavailable = error?.status === 0 || error?.status === 404;
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <p className="text-sm font-semibold text-foreground">
        {isUnavailable
          ? t("settings.common.unavailableTitle")
          : t("settings.common.loadFailed")}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">
        {isUnavailable ? t("settings.common.unavailableBody") : error?.message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-1 rounded-full"
        >
          <RefreshCw />
          {t("settings.common.retry")}
        </Button>
      )}
    </div>
  );
}

/** Group of fields with a small heading */
export function FieldGroup({ title, description, children, columns = 2 }) {
  return (
    <section className="space-y-3">
      {(title || description) && (
        <div>
          {title && (
            <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">
              {title}
            </h4>
          )}
          {description && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      <div
        className={cn(
          "grid grid-cols-1 gap-3",
          columns === 2 && "sm:grid-cols-2",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** Label + control + hint/error. `children` is a render function receiving the input id. */
export function Field({ label, hint, error, className, children }) {
  const id = useId();
  return (
    <div className={cn("space-y-1", className)}>
      <label
        htmlFor={id}
        className="text-[11px] font-medium text-muted-foreground"
      >
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-[11px] font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Text input bound to a draft field */
export function TextField({
  label,
  hint,
  error,
  value,
  onChange,
  className,
  ...inputProps
}) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(id) => (
        <Input
          id={id}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error) || undefined}
          {...inputProps}
        />
      )}
    </Field>
  );
}

export const selectClassName =
  "flex h-9.5 w-full rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground shadow-2xs focus-visible:border-primary/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-50";

/** Checkbox row with label and hint */
export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
  children,
}) {
  const id = useId();
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 p-3 transition-colors sm:col-span-2",
        checked ? "bg-primary/5 border-primary/30" : "",
        disabled && "opacity-60",
      )}
    >
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span className="space-y-0.5">
          <span className="block text-xs font-semibold text-foreground">
            {label}
          </span>
          {hint && (
            <span className="block text-[11px] text-muted-foreground">
              {hint}
            </span>
          )}
        </span>
      </label>
      {children && <div className="mt-3 pl-7">{children}</div>}
    </div>
  );
}
