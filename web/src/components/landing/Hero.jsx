"use client";

import {
  ArrowRight,
  FileCheck2,
  MessageCircle,
  QrCode,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatCurrency } from "@/lib/formatCurrency";
import { localeFor } from "@/lib/i18n/dictionaries";
import { usePreferences } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

// Example figures for the preview; they add up (1.764 = 21% of 8.400, etc.)
const EXAMPLE = {
  vatDue: 1452,
  vatSales: 1764,
  vatInput: 312,
  vatDeadline: new Date(2027, 0, 31),
  receiptTotal: 96.8,
  receiptVat: 16.8,
  invoiceTotal: 1452,
};

export function LandingHero() {
  const { t, language } = usePreferences();
  const locale = localeFor(language);
  const money = (value) => formatCurrency(value, "EUR", locale);
  const router = useRouter();
  const { isAuthenticated, openLogin, openRegister } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("landing.hero.eyebrow")}
          </p>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            {t("landing.hero.title")}
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {t("landing.hero.subtitle")}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            {isAuthenticated ? (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "rounded-full px-7 font-bold shadow-md hover:shadow-lg",
                  )}
                >
                  <span>{t("landing.hero.toDashboard")}</span>
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/invoices"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "rounded-full px-6",
                  )}
                >
                  {t("landing.hero.newInvoice")}
                </Link>
              </div>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={openRegister}
                  className="w-full sm:w-auto rounded-full px-8 font-bold shadow-md hover:shadow-lg active:scale-98 transition-all cursor-pointer h-12"
                >
                  <span>{t("landing.hero.register")}</span>
                  <ArrowRight className="size-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={openLogin}
                  className="w-full sm:w-auto rounded-full px-7 cursor-pointer h-12 border-border/80 hover:bg-muted"
                >
                  <span>{t("landing.hero.login")}</span>
                </Button>
                <a
                  href="#features"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                    "w-full sm:w-auto rounded-full px-6 text-muted-foreground hover:text-foreground h-12",
                  )}
                >
                  {t("landing.hero.seeFeatures")}
                </a>
              </>
            )}
          </div>

          <p className="pt-4 text-xs text-muted-foreground">
            {t("landing.hero.highlights")}
          </p>
        </div>

        {/* Preview of the real screens, with example numbers */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-border/80 bg-card shadow-sm p-4 sm:p-7 overflow-hidden">
            <div className="flex items-center justify-between pb-5 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {t("landing.preview.title")}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {t("landing.preview.subtitle")}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border/70">
                {t("landing.preview.badge")}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
              {/* Belastingkluis: VAT for the quarter */}
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 space-y-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Wallet className="size-3.5 text-primary" />
                  {t("landing.preview.vatTitle")}
                </span>
                <div className="space-y-1">
                  <p className="text-2xl font-extrabold tracking-tight text-foreground">
                    {money(EXAMPLE.vatDue)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("landing.preview.vatDue", {
                      date: EXAMPLE.vatDeadline.toLocaleDateString(locale, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }),
                    })}
                  </p>
                </div>
                <dl className="space-y-1 border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                  <div className="flex justify-between">
                    <dt>{t("landing.preview.vatSales")}</dt>
                    <dd className="font-mono">{money(EXAMPLE.vatSales)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>{t("landing.preview.vatInput")}</dt>
                    <dd className="font-mono">− {money(EXAMPLE.vatInput)}</dd>
                  </div>
                </dl>
              </div>

              {/* Receipt that came in via WhatsApp */}
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MessageCircle className="size-3.5 text-emerald-500" />
                    {t("landing.preview.receiptTitle")}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    {t("landing.preview.receiptStatus")}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">
                    {t("landing.preview.receiptShop")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("landing.preview.receiptItems")}
                  </p>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-lg font-bold text-foreground">
                    {money(EXAMPLE.receiptTotal)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {t("landing.preview.receiptVat", {
                      amount: money(EXAMPLE.receiptVat),
                    })}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                  {t("landing.preview.receiptRead")}
                </p>
              </div>

              {/* Invoice paid via iDEAL */}
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileCheck2 className="size-3.5 text-emerald-500" />
                    {t("landing.preview.invoiceTitle")}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    {t("landing.preview.invoiceStatus")}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">
                    {t("landing.preview.invoiceClient")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("landing.preview.invoiceJob")}
                  </p>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-lg font-bold text-foreground">
                    {money(EXAMPLE.invoiceTotal)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {t("landing.preview.invoiceVat")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 pt-1 border-t border-border/40">
                  <QrCode className="size-3" />
                  <span>{t("landing.preview.invoicePaid")}</span>
                </div>
              </div>
            </div>
            <p className="pt-4 text-center text-[10px] text-muted-foreground">
              {t("landing.preview.footnote")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
