"use client";

import { Check, Languages, Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import {
  FieldGroup,
  SettingsSection,
} from "@/components/settings/SettingsSection";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n/dictionaries";
import { usePreferences } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "system", icon: Monitor },
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
];

/**
 * Language and theme: applied immediately, no save button.
 */
export function DisplaySection() {
  const { language, theme, updatePreferences, t } = usePreferences();
  const [status, setStatus] = useState(null); // null | "synced" | "local"

  const change = async (patch) => {
    setStatus(null);
    const { synced } = await updatePreferences(patch);
    setStatus(synced ? "synced" : "local");
  };

  return (
    <SettingsSection
      title={t("settings.display.title")}
      description={t("settings.display.description")}
      icon={<Languages className="size-5" />}
    >
      <FieldGroup title={t("settings.display.language")}>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <OptionCard
            key={lang.code}
            selected={language === lang.code}
            onClick={() => change({ language: lang.code })}
            title={lang.label}
            subtitle={lang.code.toUpperCase()}
          />
        ))}
      </FieldGroup>

      <FieldGroup title={t("settings.display.theme")} columns={1}>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(({ value, icon: Icon }) => (
            <OptionCard
              key={value}
              selected={theme === value}
              onClick={() => change({ theme: value })}
              title={t(`settings.display.themes.${value}`)}
              icon={<Icon className="size-4" />}
            />
          ))}
        </div>
      </FieldGroup>

      {status && (
        <p
          className={cn(
            "text-[11px]",
            status === "synced"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground",
          )}
        >
          {status === "synced"
            ? t("settings.display.synced")
            : t("settings.display.localOnly")}
        </p>
      )}
    </SettingsSection>
  );
}

function OptionCard({ selected, onClick, title, subtitle, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer",
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border/60 hover:bg-muted/40",
      )}
    >
      {icon && (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-foreground">
          {title}
        </span>
        {subtitle && (
          <span className="block text-[10px] text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
      {selected && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  );
}

export default DisplaySection;
