"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ClipboardCheck,
  Loader2,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Field,
  selectClassName,
  TextField,
} from "@/components/settings/SettingsSection";
import {
  isValidPhone,
  isValidVatNumber,
} from "@/components/settings/validators";
import { Button } from "@/components/ui/button";
import { profileApi } from "@/lib/api/profile";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  isProfileComplete,
  LEGAL_FORMS,
  REQUIRED_PROFILE_FIELDS,
} from "@/lib/auth/profile";
import { DEFAULT_COUNTRY, getCountryOptions } from "@/lib/countries";
import { usePreferences } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "about", icon: UserRound },
  { key: "business", icon: Building2 },
  { key: "review", icon: ClipboardCheck },
];

/** Translation key of the label for each required profile field */
const FIELD_LABELS = {
  full_name: "onboarding.fullName",
  phone_number: "onboarding.phone",
  country: "onboarding.country",
  business_name: "onboarding.businessName",
  legal_form: "onboarding.legalForm",
};

/** Any EU-style VAT ID: 2-letter country prefix + 2 to 13 letters/digits */
const GENERIC_VAT_PATTERN = /^[A-Z]{2}[A-Z0-9]{2,13}$/;

const cleanPhone = (value) => String(value ?? "").replace(/[\s\-()]/g, "");
const cleanVat = (value) =>
  String(value ?? "")
    .replace(/[\s.]/g, "")
    .toUpperCase();

/**
 * Asked once after sign-up: everything about the user and their business that the
 * system can't fill in itself. App pages redirect here until it's complete.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, openLogin, updateUser } = useAuth();
  const { language, t } = usePreferences();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const countries = useMemo(() => getCountryOptions(language), [language]);

  // Only for logged-in users who still have to fill in their profile
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/?auth=required");
      openLogin();
    } else if (isProfileComplete(user) && !isSaving) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, isSaving, router, openLogin]);

  // Start from whatever the backend already knows about this user
  useEffect(() => {
    if (!user || draft) return;
    setDraft({
      full_name: user.full_name ?? "",
      phone_number: user.phone_number ?? "",
      business_name: user.business_name ?? "",
      legal_form: user.legal_form ?? "",
      vat_number: user.vat_number ?? "",
      country: user.country || DEFAULT_COUNTRY,
    });
  }, [user, draft]);

  if (isLoading || !isAuthenticated || !draft) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const setField = (field) => (value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateStep = (index) => {
    const next = {};
    const required = t("onboarding.required");
    if (index === 0) {
      if (!draft.full_name.trim()) next.full_name = required;
      if (!draft.phone_number.trim()) next.phone_number = required;
      else if (!isValidPhone(draft.phone_number))
        next.phone_number = t("onboarding.phoneInvalid");
    }
    if (index === 1) {
      if (!draft.business_name.trim()) next.business_name = required;
      if (!draft.legal_form) next.legal_form = required;
      if (!draft.country) next.country = required;
      const vat = cleanVat(draft.vat_number);
      if (vat) {
        if (draft.country === "NL" && !isValidVatNumber(vat))
          next.vat_number = t("onboarding.vatNumberInvalidNl");
        else if (draft.country !== "NL" && !GENERIC_VAT_PATTERN.test(vat))
          next.vat_number = t("onboarding.vatNumberInvalid");
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) setStep((s) => s + 1);
  };

  const handleSave = async () => {
    // Re-check every step, in case a field was cleared after moving on
    for (const index of [0, 1]) {
      if (!validateStep(index)) {
        setStep(index);
        return;
      }
    }
    const payload = {
      full_name: draft.full_name.trim(),
      phone_number: cleanPhone(draft.phone_number),
      business_name: draft.business_name.trim(),
      legal_form: draft.legal_form,
      vat_number: cleanVat(draft.vat_number) || null,
      country: draft.country,
    };
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await profileApi.update(payload);
      const savedUser = res?.user ?? { ...user, ...payload };
      updateUser(savedUser);
      // The app pages would send an incomplete profile straight back here, so say
      // which fields the server didn't store instead of bouncing between pages
      const missing = REQUIRED_PROFILE_FIELDS.filter(
        (field) => !String(savedUser[field] ?? "").trim(),
      );
      if (missing.length > 0) {
        setSaveError(
          t("onboarding.notSaved", {
            fields: missing.map((field) => t(FIELD_LABELS[field])).join(", "),
          }),
        );
        setIsSaving(false);
        return;
      }
      router.replace("/dashboard");
    } catch (err) {
      setSaveError(err?.message || t("onboarding.saveFailed"));
      setIsSaving(false);
    }
  };

  const countryName = (code) =>
    countries.find((c) => c.code === code)?.name ?? code;

  const reviewRows = [
    { label: t("onboarding.email"), value: user.email, step: null },
    { label: t("onboarding.fullName"), value: draft.full_name, step: 0 },
    {
      label: t("onboarding.phone"),
      value: cleanPhone(draft.phone_number),
      step: 0,
    },
    {
      label: t("onboarding.businessName"),
      value: draft.business_name,
      step: 1,
    },
    {
      label: t("onboarding.legalForm"),
      value: draft.legal_form && t(`onboarding.legalForms.${draft.legal_form}`),
      step: 1,
    },
    {
      label: t("onboarding.vatNumber"),
      value: cleanVat(draft.vat_number),
      step: 1,
    },
    {
      label: t("onboarding.country"),
      value: countryName(draft.country),
      step: 1,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-lg font-bold text-foreground">
          {t("onboarding.title")}
        </h1>
        <p className="text-xs text-muted-foreground">
          {t("onboarding.subtitle")}
        </p>
      </div>

      {/* Step indicator */}
      <ol className="flex items-center gap-2">
        {STEPS.map(({ key, icon: Icon }, index) => (
          <li key={key} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full border text-xs transition-colors",
                index < step &&
                  "border-primary bg-primary text-primary-foreground",
                index === step && "border-primary bg-primary/10 text-primary",
                index > step && "border-border text-muted-foreground",
              )}
            >
              {index < step ? (
                <Check className="size-4" />
              ) : (
                <Icon className="size-4" />
              )}
            </span>
            <span
              className={cn(
                "text-[11px] font-medium",
                index === step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {t(`onboarding.steps.${key}`)}
            </span>
          </li>
        ))}
      </ol>
      <p className="sr-only" aria-live="polite">
        {t("onboarding.step", { current: step + 1, total: STEPS.length })}
      </p>

      {step === 0 && (
        <div className="space-y-4">
          <TextField
            label={t("onboarding.fullName")}
            placeholder={t("onboarding.fullNamePlaceholder")}
            autoComplete="name"
            value={draft.full_name}
            onChange={setField("full_name")}
            error={errors.full_name}
          />
          <TextField
            label={t("onboarding.phone")}
            hint={t("onboarding.phoneHint")}
            type="tel"
            autoComplete="tel"
            placeholder="+31 6 1234 5678"
            value={draft.phone_number}
            onChange={setField("phone_number")}
            error={errors.phone_number}
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <TextField
            label={t("onboarding.businessName")}
            placeholder={t("onboarding.businessNamePlaceholder")}
            autoComplete="organization"
            value={draft.business_name}
            onChange={setField("business_name")}
            error={errors.business_name}
          />

          <fieldset className="space-y-1.5">
            <legend className="text-[11px] font-medium text-muted-foreground">
              {t("onboarding.legalForm")}
            </legend>
            <div className="space-y-2 pt-1">
              {LEGAL_FORMS.map((form) => (
                <label
                  key={form}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                    draft.legal_form === form
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/60 hover:bg-muted/40",
                  )}
                >
                  <input
                    type="radio"
                    name="legal_form"
                    value={form}
                    checked={draft.legal_form === form}
                    onChange={() => setField("legal_form")(form)}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span className="space-y-0.5">
                    <span className="block text-xs font-semibold text-foreground">
                      {t(`onboarding.legalForms.${form}`)}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t(`onboarding.legalFormHints.${form}`)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {errors.legal_form ? (
              <p className="text-[11px] font-medium text-destructive">
                {errors.legal_form}
              </p>
            ) : (
              draft.legal_form &&
              draft.legal_form !== "eenmanszaak" && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  {t("onboarding.legalFormLimited")}
                </p>
              )
            )}
          </fieldset>

          <Field label={t("onboarding.country")} error={errors.country}>
            {(id) => (
              <select
                id={id}
                className={selectClassName}
                value={draft.country}
                autoComplete="country"
                onChange={(e) => setField("country")(e.target.value)}
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <TextField
            label={t("onboarding.vatNumber")}
            hint={t("onboarding.vatNumberHint")}
            placeholder={draft.country === "NL" ? "NL123456789B01" : ""}
            value={draft.vat_number}
            onChange={setField("vat_number")}
            onBlur={() =>
              draft.vat_number &&
              setField("vat_number")(cleanVat(draft.vat_number))
            }
            error={errors.vat_number}
          />
        </div>
      )}

      {step === 2 && (
        <dl className="divide-y divide-border/50 rounded-xl border border-border/60">
          {reviewRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <dt className="text-[11px] text-muted-foreground">
                  {row.label}
                </dt>
                <dd
                  className={cn(
                    "truncate text-xs font-semibold",
                    row.value ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {row.value || t("onboarding.notFilled")}
                </dd>
              </div>
              {row.step !== null && (
                <button
                  type="button"
                  onClick={() => setStep(row.step)}
                  className="shrink-0 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  {t("onboarding.edit")}
                </button>
              )}
            </div>
          ))}
        </dl>
      )}

      {saveError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{saveError}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => s - 1)}
            disabled={isSaving}
          >
            <ArrowLeft />
            {t("onboarding.back")}
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Button size="sm" onClick={goNext}>
            {t("onboarding.next")}
            <ArrowRight />
          </Button>
        ) : (
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Check />}
            {isSaving ? t("onboarding.saving") : t("onboarding.finish")}
          </Button>
        )}
      </div>
    </div>
  );
}
