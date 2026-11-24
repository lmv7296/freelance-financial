"use client";

import { Bell } from "lucide-react";
import {
  Field,
  FieldGroup,
  SettingsSection,
  selectClassName,
  ToggleRow,
} from "@/components/settings/SettingsSection";
import { useSettingsResource } from "@/components/settings/useSettingsResource";
import { settingsApi } from "@/lib/api/settings";
import { useT } from "@/lib/preferences/PreferencesContext";

const REMINDER_DAYS = [3, 7, 14];

const DEFAULTS = {
  vat_deadline_reminder: true,
  vat_deadline_days_before: 7,
  receipts_to_review: "daily",
  overdue_invoices: true,
  income_tax_deadline_reminder: true,
};

const loadNotifications = async () => ({
  ...DEFAULTS,
  ...((await settingsApi.getPreferences())?.preferences?.notifications ?? {}),
});

const saveNotifications = async (notifications) => {
  const res = await settingsApi.updatePreferences({ notifications });
  return res?.preferences?.notifications ?? notifications;
};

const identity = (value) => ({ ...value });

export function NotificationsSection() {
  const t = useT();
  const resource = useSettingsResource({
    load: loadNotifications,
    save: saveNotifications,
    toDraft: identity,
    fromDraft: identity,
  });
  const { draft, setDraft } = resource;
  const setField = (field) => (value) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  return (
    <SettingsSection
      title={t("settings.notifications.title")}
      description={t("settings.notifications.description")}
      icon={<Bell className="size-5" />}
      resource={resource}
    >
      {draft && (
        <FieldGroup>
          <ToggleRow
            label={t("settings.notifications.vatDeadline")}
            hint={t("settings.notifications.vatDeadlineHint")}
            checked={draft.vat_deadline_reminder}
            onChange={setField("vat_deadline_reminder")}
          >
            <Field label={t("settings.notifications.daysBefore")}>
              {(id) => (
                <select
                  id={id}
                  value={String(draft.vat_deadline_days_before)}
                  disabled={!draft.vat_deadline_reminder}
                  onChange={(e) =>
                    setField("vat_deadline_days_before")(Number(e.target.value))
                  }
                  className={`${selectClassName} max-w-48`}
                >
                  {REMINDER_DAYS.map((days) => (
                    <option key={days} value={String(days)}>
                      {t("settings.notifications.daysBeforeOption", {
                        count: days,
                      })}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </ToggleRow>
          <ToggleRow
            label={t("settings.notifications.incomeTax")}
            hint={t("settings.notifications.incomeTaxHint")}
            checked={draft.income_tax_deadline_reminder}
            onChange={setField("income_tax_deadline_reminder")}
          />
          <ToggleRow
            label={t("settings.notifications.overdue")}
            hint={t("settings.notifications.overdueHint")}
            checked={draft.overdue_invoices}
            onChange={setField("overdue_invoices")}
          />
          <Field
            label={t("settings.notifications.receipts")}
            hint={t("settings.notifications.receiptsHint")}
            className="sm:col-span-2"
          >
            {(id) => (
              <select
                id={id}
                value={draft.receipts_to_review}
                onChange={(e) => setField("receipts_to_review")(e.target.value)}
                className={`${selectClassName} max-w-72`}
              >
                {["off", "instant", "daily"].map((value) => (
                  <option key={value} value={value}>
                    {t(`settings.notifications.receiptsOptions.${value}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </FieldGroup>
      )}
    </SettingsSection>
  );
}

export default NotificationsSection;
