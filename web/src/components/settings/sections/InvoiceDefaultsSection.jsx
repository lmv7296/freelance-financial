"use client";

import { FileText } from "lucide-react";
import { useState } from "react";
import {
  Field,
  FieldGroup,
  SettingsSection,
  selectClassName,
  TextField,
} from "@/components/settings/SettingsSection";
import { useSettingsResource } from "@/components/settings/useSettingsResource";
import { Input } from "@/components/ui/input";
import { useAppConfig } from "@/lib/api/config";
import { settingsApi } from "@/lib/api/settings";
import { useT } from "@/lib/preferences/PreferencesContext";

const COMMON_TERMS = [7, 14, 30];

const loadDefaults = async () =>
  (await settingsApi.getInvoiceDefaults())?.invoice_defaults ?? {};
const saveDefaults = async (payload) =>
  (await settingsApi.updateInvoiceDefaults(payload))?.invoice_defaults ??
  payload;

const toDraft = (d) => ({
  payment_term_days: String(d.payment_term_days ?? ""),
  number_prefix: d.number_prefix ?? "",
  next_number: String(d.next_number ?? ""),
  number_padding: String(d.number_padding ?? 4),
  default_vat_rate:
    d.default_vat_rate === null || d.default_vat_rate === undefined
      ? ""
      : String(d.default_vat_rate),
  default_payment_method: d.default_payment_method ?? "",
  footer_text: d.footer_text ?? "",
});

const fromDraft = (draft) => ({
  payment_term_days: Number.parseInt(draft.payment_term_days, 10),
  number_prefix: draft.number_prefix.trim(),
  next_number: Number.parseInt(draft.next_number, 10),
  number_padding: Number.parseInt(draft.number_padding, 10),
  default_vat_rate:
    draft.default_vat_rate === "" ? null : Number(draft.default_vat_rate),
  default_payment_method: draft.default_payment_method || null,
  footer_text: draft.footer_text.trim() || null,
});

function validate(draft, t) {
  const errors = {};
  const term = Number(draft.payment_term_days);
  if (!Number.isInteger(term) || term < 1 || term > 365)
    errors.payment_term_days = t("settings.invoices.errors.term");
  const next = Number(draft.next_number);
  if (!Number.isInteger(next) || next < 1)
    errors.next_number = t("settings.invoices.errors.nextNumber");
  return errors;
}

export function InvoiceDefaultsSection() {
  const t = useT();
  const { vatRates, paymentMethods } = useAppConfig();
  const resource = useSettingsResource({
    load: loadDefaults,
    save: saveDefaults,
    toDraft,
    fromDraft,
  });
  const { draft, setDraft } = resource;
  const [showErrors, setShowErrors] = useState(false);

  const errors = draft ? validate(draft, t) : {};
  const setField = (field) => (value) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => {
    setShowErrors(true);
    if (Object.keys(errors).length === 0) resource.submit();
  };

  const isCustomTerm =
    draft && !COMMON_TERMS.includes(Number(draft.payment_term_days));
  const padding = Math.min(Math.max(Number(draft?.number_padding) || 0, 0), 8);
  const previewNumber = draft
    ? `${draft.number_prefix}${String(Number(draft.next_number) || 1).padStart(padding, "0")}`
    : "";

  return (
    <SettingsSection
      title={t("settings.invoices.title")}
      description={t("settings.invoices.description")}
      icon={<FileText className="size-5" />}
      resource={resource}
      onSave={handleSave}
    >
      {draft && (
        <>
          <FieldGroup title={t("settings.invoices.groupNumbering")}>
            <TextField
              label={t("settings.invoices.prefix")}
              hint={t("settings.invoices.prefixHint")}
              placeholder="INV-2026-"
              value={draft.number_prefix}
              onChange={setField("number_prefix")}
            />
            <TextField
              label={t("settings.invoices.nextNumber")}
              inputMode="numeric"
              value={draft.next_number}
              onChange={setField("next_number")}
              error={showErrors ? errors.next_number : undefined}
            />
            <Field label={t("settings.invoices.padding")}>
              {(id) => (
                <select
                  id={id}
                  value={draft.number_padding}
                  onChange={(e) => setField("number_padding")(e.target.value)}
                  className={selectClassName}
                >
                  {[0, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={String(n)}>
                      {n === 0
                        ? t("settings.invoices.paddingNone")
                        : t("settings.invoices.paddingDigits", { count: n })}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("settings.invoices.preview")}
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-foreground">
                {previewNumber}
              </p>
            </div>
          </FieldGroup>

          <FieldGroup title={t("settings.invoices.groupPayment")}>
            <Field
              label={t("settings.invoices.term")}
              error={showErrors ? errors.payment_term_days : undefined}
            >
              {(id) => (
                <div className="flex gap-2">
                  <select
                    id={id}
                    value={isCustomTerm ? "custom" : draft.payment_term_days}
                    onChange={(e) =>
                      setField("payment_term_days")(
                        e.target.value === "custom" ? "" : e.target.value,
                      )
                    }
                    className={selectClassName}
                  >
                    {COMMON_TERMS.map((days) => (
                      <option key={days} value={String(days)}>
                        {t("settings.invoices.termDays", { count: days })}
                      </option>
                    ))}
                    <option value="custom">
                      {t("settings.invoices.termCustom")}
                    </option>
                  </select>
                  {isCustomTerm && (
                    <Input
                      aria-label={t("settings.invoices.term")}
                      inputMode="numeric"
                      value={draft.payment_term_days}
                      onChange={(e) =>
                        setField("payment_term_days")(e.target.value)
                      }
                      className="w-24"
                    />
                  )}
                </div>
              )}
            </Field>
            <Field label={t("settings.invoices.defaultVat")}>
              {(id) => (
                <select
                  id={id}
                  value={draft.default_vat_rate}
                  onChange={(e) => setField("default_vat_rate")(e.target.value)}
                  className={selectClassName}
                >
                  <option value="">{t("settings.invoices.noDefault")}</option>
                  {vatRates.map((rate) => (
                    <option key={rate.rate} value={String(rate.rate)}>
                      {rate.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t("settings.invoices.defaultPaymentMethod")}>
              {(id) => (
                <select
                  id={id}
                  value={draft.default_payment_method}
                  onChange={(e) =>
                    setField("default_payment_method")(e.target.value)
                  }
                  className={selectClassName}
                >
                  <option value="">{t("settings.invoices.noDefault")}</option>
                  {paymentMethods.map((method) => {
                    const label =
                      typeof method === "object"
                        ? method.label || method.value
                        : method;
                    return (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              )}
            </Field>
          </FieldGroup>

          <Field
            label={t("settings.invoices.footer")}
            hint={t("settings.invoices.footerHint")}
          >
            {(id) => (
              <textarea
                id={id}
                rows={3}
                value={draft.footer_text}
                onChange={(e) => setField("footer_text")(e.target.value)}
                className="flex w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-sm text-foreground shadow-2xs focus-visible:border-primary/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20 resize-y"
              />
            )}
          </Field>
        </>
      )}
    </SettingsSection>
  );
}

export default InvoiceDefaultsSection;
