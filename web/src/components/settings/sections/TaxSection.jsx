"use client";

import { ArrowRight, Landmark, Settings2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { TaxProfileModal } from "@/components/tax-vault/TaxProfileModal";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/preferences/PreferencesContext";

/**
 * Entry point to the Tax Vault settings (same modal as on the Tax Vault page).
 */
export function TaxSection() {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <SettingsSection
      title={t("settings.tax.title")}
      description={t("settings.tax.description")}
      icon={<Landmark className="size-5" />}
    >
      <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
        <li>{t("settings.tax.itemLegalForm")}</li>
        <li>{t("settings.tax.itemVat")}</li>
        <li>{t("settings.tax.itemDeductions")}</li>
        <li>{t("settings.tax.itemAccountant")}</li>
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            setSaved(false);
            setIsOpen(true);
          }}
        >
          <Settings2 />
          {t("settings.tax.open")}
        </Button>
        <Link
          href="/tax-vault"
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          {t("settings.tax.goToVault")}
          <ArrowRight className="size-3.5" />
        </Link>
        {saved && (
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {t("settings.common.saved")}
          </span>
        )}
      </div>

      <TaxProfileModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSaved={() => {
          setIsOpen(false);
          setSaved(true);
        }}
      />
    </SettingsSection>
  );
}

export default TaxSection;
