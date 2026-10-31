"use client";

import { Building2, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  FieldGroup,
  SettingsSection,
  TextField,
} from "@/components/settings/SettingsSection";
import { useSettingsResource } from "@/components/settings/useSettingsResource";
import {
  formatIban,
  isValidEmail,
  isValidIban,
  isValidKvk,
  isValidPhone,
  isValidPostalCodeNL,
  isValidVatNumber,
} from "@/components/settings/validators";
import { Button } from "@/components/ui/button";
import { settingsApi } from "@/lib/api/settings";
import { useT } from "@/lib/preferences/PreferencesContext";

const LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

const FIELDS = [
  "company_name",
  "trade_name",
  "kvk_number",
  "vat_number",
  "street",
  "postal_code",
  "city",
  "country",
  "email",
  "phone",
  "website",
  "iban",
];

const loadCompany = async () => (await settingsApi.getCompany())?.company ?? {};
const saveCompany = async (payload) =>
  (await settingsApi.updateCompany(payload))?.company ?? payload;

const toDraft = (company) =>
  Object.fromEntries(
    FIELDS.map((field) => [
      field,
      field === "country" ? (company[field] ?? "NL") : (company[field] ?? ""),
    ]),
  );

const fromDraft = (draft) =>
  Object.fromEntries(
    FIELDS.map((field) => {
      let value = String(draft[field] ?? "").trim();
      if (field === "iban" && value)
        value = value.replace(/\s/g, "").toUpperCase();
      if (field === "vat_number" && value)
        value = value.replace(/[\s.]/g, "").toUpperCase();
      if (field === "postal_code" && value) value = value.toUpperCase();
      if (field === "kvk_number" && value) value = value.replace(/\s/g, "");
      return [field, value || null];
    }),
  );

function validate(draft, t) {
  const errors = {};
  const filled = (field) => String(draft[field] ?? "").trim();
  if (filled("kvk_number") && !isValidKvk(draft.kvk_number))
    errors.kvk_number = t("settings.company.errors.kvk");
  if (filled("vat_number") && !isValidVatNumber(draft.vat_number))
    errors.vat_number = t("settings.company.errors.vat");
  if (
    filled("postal_code") &&
    draft.country === "NL" &&
    !isValidPostalCodeNL(draft.postal_code)
  )
    errors.postal_code = t("settings.company.errors.postalCode");
  if (filled("iban") && !isValidIban(draft.iban))
    errors.iban = t("settings.company.errors.iban");
  if (filled("email") && !isValidEmail(draft.email))
    errors.email = t("settings.company.errors.email");
  if (filled("phone") && !isValidPhone(draft.phone))
    errors.phone = t("settings.company.errors.phone");
  return errors;
}

export function CompanySection() {
  const t = useT();
  const resource = useSettingsResource({
    load: loadCompany,
    save: saveCompany,
    toDraft,
    fromDraft,
  });
  const { draft, setDraft } = resource;
  const [showErrors, setShowErrors] = useState(false);

  const errors = draft ? validate(draft, t) : {};
  const errorFor = (field) => (showErrors ? errors[field] : undefined);
  const setField = (field) => (value) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => {
    setShowErrors(true);
    if (Object.keys(errors).length === 0) resource.submit();
  };

  return (
    <SettingsSection
      title={t("settings.company.title")}
      description={t("settings.company.description")}
      icon={<Building2 className="size-5" />}
      resource={resource}
      onSave={handleSave}
    >
      {draft && (
        <>
          <LogoUploader initialUrl={resource.data?.logo_url ?? null} />

          <FieldGroup title={t("settings.company.groupBusiness")}>
            <TextField
              label={t("settings.company.companyName")}
              value={draft.company_name}
              onChange={setField("company_name")}
            />
            <TextField
              label={t("settings.company.tradeName")}
              hint={t("settings.company.tradeNameHint")}
              value={draft.trade_name}
              onChange={setField("trade_name")}
            />
            <TextField
              label={t("settings.company.kvk")}
              placeholder="12345678"
              inputMode="numeric"
              value={draft.kvk_number}
              onChange={setField("kvk_number")}
              error={errorFor("kvk_number")}
            />
            <TextField
              label={t("settings.company.vatNumber")}
              hint={t("settings.company.vatNumberHint")}
              placeholder="NL123456789B01"
              value={draft.vat_number}
              onChange={setField("vat_number")}
              error={errorFor("vat_number")}
            />
          </FieldGroup>

          <FieldGroup title={t("settings.company.groupAddress")}>
            <TextField
              label={t("settings.company.street")}
              className="sm:col-span-2"
              value={draft.street}
              onChange={setField("street")}
            />
            <TextField
              label={t("settings.company.postalCode")}
              placeholder="1016 HE"
              value={draft.postal_code}
              onChange={setField("postal_code")}
              error={errorFor("postal_code")}
            />
            <TextField
              label={t("settings.company.city")}
              value={draft.city}
              onChange={setField("city")}
            />
            <TextField
              label={t("settings.company.country")}
              hint={t("settings.company.countryHint")}
              maxLength={2}
              value={draft.country}
              onChange={(v) => setField("country")(v.toUpperCase())}
            />
          </FieldGroup>

          <FieldGroup title={t("settings.company.groupContact")}>
            <TextField
              label={t("settings.company.email")}
              type="email"
              value={draft.email}
              onChange={setField("email")}
              error={errorFor("email")}
            />
            <TextField
              label={t("settings.company.phone")}
              type="tel"
              value={draft.phone}
              onChange={setField("phone")}
              error={errorFor("phone")}
            />
            <TextField
              label={t("settings.company.website")}
              type="url"
              placeholder="https://"
              value={draft.website}
              onChange={setField("website")}
            />
            <TextField
              label={t("settings.company.iban")}
              hint={t("settings.company.ibanHint")}
              placeholder="NL00 BANK 0123 4567 89"
              value={draft.iban}
              onChange={setField("iban")}
              onBlur={() =>
                draft.iban && setField("iban")(formatIban(draft.iban))
              }
              error={errorFor("iban")}
            />
          </FieldGroup>
        </>
      )}
    </SettingsSection>
  );
}

/** Logo is uploaded immediately, separate from the save button of the form */
function LogoUploader({ initialUrl }) {
  const t = useT();
  const inputRef = useRef(null);
  const [logoUrl, setLogoUrl] = useState(initialUrl);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setError(t("settings.company.logoType"));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError(t("settings.company.logoSize"));
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const res = await settingsApi.uploadLogo(file);
      setLogoUrl(res?.company?.logo_url ?? null);
    } catch (err) {
      setError(err?.message || t("settings.common.saveFailed"));
    } finally {
      setIsBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await settingsApi.deleteLogo();
      setLogoUrl(null);
    } catch (err) {
      setError(err?.message || t("settings.common.saveFailed"));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/30">
        {logoUrl ? (
          // biome-ignore lint/performance/noImgElement: logo is served by the backend
          <img
            src={logoUrl}
            alt={t("settings.company.logo")}
            className="size-full object-contain p-1.5"
          />
        ) : (
          <ImagePlus className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-foreground">
          {t("settings.company.logo")}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {t("settings.company.logoHint")}
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={LOGO_TYPES.join(",")}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            size="xs"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
          >
            {isBusy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            {logoUrl
              ? t("settings.company.logoReplace")
              : t("settings.company.logoUpload")}
          </Button>
          {logoUrl && (
            <Button
              variant="ghost"
              size="xs"
              disabled={isBusy}
              onClick={handleRemove}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 />
              {t("settings.company.logoRemove")}
            </Button>
          )}
        </div>
        {error && (
          <p className="text-[11px] font-medium text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}

export default CompanySection;
