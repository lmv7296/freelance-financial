"use client";

import { Loader2, Settings2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { taxVaultApi } from "@/lib/api/taxVault";
import { useT } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

const selectClassName =
  "flex h-9.5 w-full rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground shadow-2xs focus-visible:border-primary/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-50";

function toInput(value) {
  return value === null || value === undefined
    ? ""
    : String(value).replace(".", ",");
}

function toNumberOrNull(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number.parseFloat(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Fiscal settings the backend needs to pick the right rules (legal form, urencriterium, KOR, ...)
 */
export function TaxProfileModal({ isOpen, onClose, onSaved }) {
  const t = useT();
  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setDraft(null);
    setLoadError(null);
    taxVaultApi
      .getProfile()
      .then((res) => {
        if (cancelled) return;
        const p = res?.profile ?? {};
        setDraft({
          legal_form: p.legal_form ?? "eenmanszaak",
          vat_filing_frequency: p.vat_filing_frequency ?? "quarter",
          uses_kor: Boolean(p.uses_kor),
          meets_hours_criterion:
            p.meets_hours_criterion === null ||
            p.meets_hours_criterion === undefined
              ? "unknown"
              : String(p.meets_hours_criterion),
          is_starter: Boolean(p.is_starter),
          reached_aow_age: Boolean(p.reached_aow_age),
          other_box1_income: toInput(p.other_box1_income),
          provisional_assessment_monthly: toInput(
            p.provisional_assessment_monthly,
          ),
          accountant_name: p.accountant_name ?? "",
          accountant_email: p.accountant_email ?? "",
        });
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(err?.message || "taxVault.profile.loadFailed");
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const setField = (field, value) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await taxVaultApi.updateProfile({
        legal_form: draft.legal_form,
        vat_filing_frequency: draft.vat_filing_frequency,
        uses_kor: draft.uses_kor,
        meets_hours_criterion:
          draft.meets_hours_criterion === "unknown"
            ? null
            : draft.meets_hours_criterion === "true",
        is_starter: draft.is_starter,
        reached_aow_age: draft.reached_aow_age,
        other_box1_income: toNumberOrNull(draft.other_box1_income),
        provisional_assessment_monthly: toNumberOrNull(
          draft.provisional_assessment_monthly,
        ),
        accountant_name: draft.accountant_name.trim() || null,
        accountant_email: draft.accountant_email.trim() || null,
      });
      onSaved?.(res?.profile);
    } catch (err) {
      setSaveError(err?.message || t("taxVault.profile.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <ModalHeader
        title={t("taxVault.profile.title")}
        description={t("taxVault.profile.description")}
        icon={<Settings2 className="size-5" />}
      />
      <ModalBody>
        {loadError ? (
          <p className="text-xs text-destructive">{t(loadError)}</p>
        ) : !draft ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <fieldset disabled={isSaving} className="space-y-5">
            <Group title={t("taxVault.profile.groupBusiness")}>
              <Field label={t("taxVault.profile.legalForm")}>
                {(id) => (
                  <select
                    id={id}
                    value={draft.legal_form}
                    onChange={(e) => setField("legal_form", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="eenmanszaak">
                      {t("taxVault.profile.eenmanszaak")}
                    </option>
                    <option value="vof" disabled>
                      {t("taxVault.profile.vof")}
                    </option>
                    <option value="bv" disabled>
                      {t("taxVault.profile.bv")}
                    </option>
                  </select>
                )}
              </Field>
              <Field label={t("taxVault.profile.vatFrequency")}>
                {(id) => (
                  <select
                    id={id}
                    value={draft.vat_filing_frequency}
                    onChange={(e) =>
                      setField("vat_filing_frequency", e.target.value)
                    }
                    disabled={draft.uses_kor}
                    className={selectClassName}
                  >
                    <option value="quarter">
                      {t("taxVault.profile.quarter")}
                    </option>
                    <option value="month">{t("taxVault.profile.month")}</option>
                    <option value="year">{t("taxVault.profile.year")}</option>
                  </select>
                )}
              </Field>
              <Toggle
                label={t("taxVault.profile.kor")}
                hint={t("taxVault.profile.korHint")}
                checked={draft.uses_kor}
                onChange={(v) => setField("uses_kor", v)}
              />
            </Group>

            <Group title={t("taxVault.profile.groupDeductions")}>
              <Field label={t("taxVault.profile.hoursCriterion")}>
                {(id) => (
                  <select
                    id={id}
                    value={draft.meets_hours_criterion}
                    onChange={(e) =>
                      setField("meets_hours_criterion", e.target.value)
                    }
                    className={selectClassName}
                  >
                    <option value="unknown">
                      {t("taxVault.profile.unknown")}
                    </option>
                    <option value="true">{t("taxVault.profile.yes")}</option>
                    <option value="false">{t("taxVault.profile.no")}</option>
                  </select>
                )}
              </Field>
              <Toggle
                label={t("taxVault.profile.starter")}
                hint={t("taxVault.profile.starterHint")}
                checked={draft.is_starter}
                onChange={(v) => setField("is_starter", v)}
              />
              <Toggle
                label={t("taxVault.profile.aow")}
                checked={draft.reached_aow_age}
                onChange={(v) => setField("reached_aow_age", v)}
              />
            </Group>

            <Group title={t("taxVault.profile.groupOther")}>
              <Field label={t("taxVault.profile.otherIncome")}>
                {(id) => (
                  <MoneyInput
                    id={id}
                    value={draft.other_box1_income}
                    onChange={(v) => setField("other_box1_income", v)}
                  />
                )}
              </Field>
              <Field label={t("taxVault.profile.provisional")}>
                {(id) => (
                  <MoneyInput
                    id={id}
                    value={draft.provisional_assessment_monthly}
                    onChange={(v) =>
                      setField("provisional_assessment_monthly", v)
                    }
                  />
                )}
              </Field>
            </Group>

            <Group title={t("taxVault.profile.groupAccountant")}>
              <Field label={t("taxVault.profile.accountantName")}>
                {(id) => (
                  <Input
                    id={id}
                    value={draft.accountant_name}
                    onChange={(e) =>
                      setField("accountant_name", e.target.value)
                    }
                  />
                )}
              </Field>
              <Field label={t("taxVault.profile.accountantEmail")}>
                {(id) => (
                  <Input
                    id={id}
                    type="email"
                    value={draft.accountant_email}
                    onChange={(e) =>
                      setField("accountant_email", e.target.value)
                    }
                  />
                )}
              </Field>
            </Group>
          </fieldset>
        )}
      </ModalBody>
      <ModalFooter>
        {saveError && (
          <span className="mr-auto text-xs text-destructive">{saveError}</span>
        )}
        <Button variant="outline" size="sm" onClick={onClose}>
          {t("taxVault.profile.cancel")}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!draft || isSaving}>
          {isSaving && <Loader2 className="animate-spin" />}
          {t("taxVault.profile.save")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function Group({ title, children }) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">
        {title}
      </h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-[11px] font-medium text-muted-foreground"
      >
        {label}
      </label>
      {children(id)}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border/60 p-3 cursor-pointer transition-colors sm:col-span-2",
        checked ? "bg-primary/5 border-primary/30" : "hover:bg-muted/40",
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
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
  );
}

function MoneyInput({ id, value, onChange }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        €
      </span>
      <Input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-7 font-mono tabular-nums"
        placeholder="0,00"
      />
    </div>
  );
}

export default TaxProfileModal;
