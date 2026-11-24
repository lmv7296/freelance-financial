"use client";

import {
  ChevronDown,
  CircleHelp,
  Copy,
  LifeBuoy,
  Mail,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import { useClipboard } from "@/lib/clipboard";
import { useT } from "@/lib/preferences/PreferencesContext";

// Set in .env.local; the page says so when it's missing instead of showing a made-up address
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

/**
 * FAQ structure. Questions and answers live in the dictionaries
 * (support.faq.<id>.q / .a); `link` points to the page the answer is about.
 * Only describe what the app really does; no tax advice.
 */
const FAQ_GROUPS = [
  {
    key: "expenses",
    items: [
      {
        id: "whatsapp",
        link: { href: "/settings#whatsapp", page: "settings" },
      },
      { id: "statuses", link: { href: "/expenses", page: "expenses" } },
      { id: "manualExpense", link: { href: "/expenses", page: "expenses" } },
    ],
  },
  {
    key: "tax",
    items: [
      { id: "estimates", link: { href: "/tax-vault", page: "taxVault" } },
      { id: "noIncomeTax", link: { href: "/settings#tax", page: "settings" } },
      { id: "accountant", link: { href: "/tax-vault", page: "taxVault" } },
      { id: "reports", link: { href: "/reports", page: "reports" } },
    ],
  },
  {
    key: "account",
    items: [
      { id: "verifyEmail" },
      {
        id: "changeLogin",
        link: { href: "/settings#account", page: "settings" },
      },
      {
        id: "logoutAll",
        link: { href: "/settings#account", page: "settings" },
      },
      { id: "loggedOut" },
      {
        id: "languageTheme",
        link: { href: "/settings#display", page: "settings" },
      },
    ],
  },
];

export default function SupportPage() {
  const t = useT();
  const { user } = useAuth();
  const { copiedId, handleCopy } = useClipboard();
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const groups = FAQ_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      ({ id }) =>
        !needle ||
        `${t(`support.faq.${id}.q`)} ${t(`support.faq.${id}.a`)}`
          .toLowerCase()
          .includes(needle),
    ),
  })).filter((group) => group.items.length > 0);

  // Pre-fill the email so support knows which account it is about
  const mailto = SUPPORT_EMAIL
    ? `mailto:${SUPPORT_EMAIL}?${new URLSearchParams({
        subject: t("support.contact.mailSubject"),
        body: user?.email
          ? t("support.contact.mailBody", { email: user.email })
          : "",
      })
        .toString()
        .replace(/\+/g, "%20")}`
    : null;

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 space-y-6 font-sans">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border border-border bg-muted text-muted-foreground">
          <LifeBuoy className="size-3" />
          {t("support.badge")}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
          {t("support.title")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {t("support.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* FAQ */}
        <div className="min-w-0 space-y-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("support.searchPlaceholder")}
              aria-label={t("support.searchPlaceholder")}
              className="flex h-10 w-full rounded-xl border border-border/80 bg-background/80 pl-10 pr-3.5 text-sm text-foreground shadow-2xs focus-visible:border-primary/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>

          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("support.noResults")}
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.key} className="space-y-2">
                <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  {t(`support.groups.${group.key}`)}
                </h2>
                <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/80 bg-card/80">
                  {group.items.map(({ id, link }) => (
                    <details key={id} className="group/faq">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                        <CircleHelp className="size-4 shrink-0 text-primary/70" />
                        <span className="flex-1">
                          {t(`support.faq.${id}.q`)}
                        </span>
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open/faq:rotate-180" />
                      </summary>
                      <div className="space-y-2 px-4 pb-4 pl-11 text-xs leading-relaxed text-muted-foreground">
                        <p className="whitespace-pre-line">
                          {t(`support.faq.${id}.a`)}
                        </p>
                        {link && (
                          <Link
                            href={link.href}
                            className="inline-flex font-semibold text-primary underline-offset-4 hover:underline"
                          >
                            {t("support.goTo", {
                              page: t(`nav.${link.page}`),
                            })}
                          </Link>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Contact */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card
            variant="outlined"
            title={t("support.contact.title")}
            description={t("support.contact.description")}
            icon={<Mail className="size-5" />}
          >
            {SUPPORT_EMAIL ? (
              <div className="space-y-3">
                <p className="break-all text-sm font-semibold text-foreground">
                  {SUPPORT_EMAIL}
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={mailto}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground shadow-xs transition-all hover:bg-primary/90"
                  >
                    <Mail className="size-3.5" />
                    {t("support.contact.send")}
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(SUPPORT_EMAIL, "email")}
                  >
                    <Copy />
                    {copiedId === "email"
                      ? t("support.contact.copied")
                      : t("support.contact.copy")}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t("support.contact.tip")}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("support.contact.notConfigured")}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
