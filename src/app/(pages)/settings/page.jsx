"use client";

import {
  Bell,
  Building2,
  FileText,
  Landmark,
  Languages,
  ListChecks,
  MessageCircle,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AccountSection } from "@/components/settings/sections/AccountSection";
import { CompanySection } from "@/components/settings/sections/CompanySection";
import { DisplaySection } from "@/components/settings/sections/DisplaySection";
import { InvoiceDefaultsSection } from "@/components/settings/sections/InvoiceDefaultsSection";
import { ListsSection } from "@/components/settings/sections/ListsSection";
import { NotificationsSection } from "@/components/settings/sections/NotificationsSection";
import { TaxSection } from "@/components/settings/sections/TaxSection";
import { WhatsAppSection } from "@/components/settings/sections/WhatsAppSection";
import { useT } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

const SECTION_GROUPS = [
  {
    key: "company",
    sections: [
      { key: "lists", icon: ListChecks, Component: ListsSection },
      { key: "company", icon: Building2, Component: CompanySection },
      { key: "invoices", icon: FileText, Component: InvoiceDefaultsSection },
      { key: "whatsapp", icon: MessageCircle, Component: WhatsAppSection },
    ],
  },
  {
    key: "personal",
    sections: [
      { key: "display", icon: Languages, Component: DisplaySection },
      { key: "account", icon: ShieldCheck, Component: AccountSection },
      { key: "notifications", icon: Bell, Component: NotificationsSection },
      { key: "tax", icon: Landmark, Component: TaxSection },
    ],
  },
];

const ALL_SECTIONS = SECTION_GROUPS.flatMap((group) => group.sections);
const DEFAULT_SECTION = ALL_SECTIONS[0].key;

const sectionFromHash = () => {
  const key = window.location.hash.replace("#", "");
  return ALL_SECTIONS.some((s) => s.key === key) ? key : DEFAULT_SECTION;
};

export default function SettingsPage() {
  const t = useT();
  const [activeKey, setActiveKey] = useState(DEFAULT_SECTION);

  // The open section lives in the URL hash so it survives reloads and can be linked to
  useEffect(() => {
    setActiveKey(sectionFromHash());
    const handleHashChange = () => setActiveKey(sectionFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const openSection = (key) => {
    setActiveKey(key);
    window.history.replaceState(null, "", `#${key}`);
  };

  const active =
    ALL_SECTIONS.find((s) => s.key === activeKey) ?? ALL_SECTIONS[0];
  const ActiveSection = active.Component;

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 space-y-6 font-sans">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border border-border bg-muted text-muted-foreground">
          <Settings className="size-3" />
          {t("settings.badge")}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
          {t("settings.title")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {t("settings.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Section navigation: horizontal pills on small screens, list on large */}
        <nav
          aria-label={t("settings.title")}
          className="lg:sticky lg:top-6 lg:self-start"
        >
          <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-5 lg:overflow-visible lg:pb-0">
            {SECTION_GROUPS.map((group) => (
              <div
                key={group.key}
                className="flex gap-1.5 lg:flex-col lg:gap-1"
              >
                <p className="hidden px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 lg:block">
                  {t(`settings.groups.${group.key}`)}
                </p>
                {group.sections.map(({ key, icon: Icon }) => {
                  const isActive = key === active.key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => openSection(key)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap transition-all cursor-pointer",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {t(`settings.nav.${key}`)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
          <ActiveSection key={active.key} />
        </div>
      </div>
    </div>
  );
}
