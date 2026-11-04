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
import { cn } from "@/lib/utils";

export function LandingHero() {
  const router = useRouter();
  const { isAuthenticated, user, openLogin, openRegister } = useAuth();

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
            Voor vakmensen en zzp'ers in Nederland
          </p>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            Financiële rust tussen klussen door.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Maak je factuur direct na de klus, laat klanten betalen via iDEAL,
            stuur je bonnetjes via WhatsApp en zie hoeveel btw en belasting je
            opzij moet zetten.
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
                  <span>Ga naar Dashboard ({user?.email})</span>
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/invoices"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "rounded-full px-6",
                  )}
                >
                  Nieuwe Factuur Maken
                </Link>
              </div>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={openRegister}
                  className="w-full sm:w-auto rounded-full px-8 font-bold shadow-md hover:shadow-lg active:scale-98 transition-all cursor-pointer h-12"
                >
                  <span>Account aanmaken</span>
                  <ArrowRight className="size-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={openLogin}
                  className="w-full sm:w-auto rounded-full px-7 cursor-pointer h-12 border-border/80 hover:bg-muted"
                >
                  <span>Inloggen</span>
                </Button>
                <a
                  href="#features"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                    "w-full sm:w-auto rounded-full px-6 text-muted-foreground hover:text-foreground h-12",
                  )}
                >
                  Bekijk alle functies
                </a>
              </>
            )}
          </div>

          <p className="pt-4 text-xs text-muted-foreground">
            Bonnetjes via WhatsApp · iDEAL & QR-code op locatie ·
            Belastingregels van dit jaar, met bronnen
          </p>
        </div>

        {/* Preview of the real screens, with example numbers */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-border/80 bg-card shadow-sm p-4 sm:p-7 overflow-hidden">
            <div className="flex items-center justify-between pb-5 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Zo ziet het eruit
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Belastingkluis, bonnetjes en facturen in één app
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border/70">
                Voorbeeld
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
              {/* Belastingkluis: VAT for the quarter */}
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 space-y-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Wallet className="size-3.5 text-primary" />
                  Belastingkluis · Btw Q4
                </span>
                <div className="space-y-1">
                  <p className="text-2xl font-extrabold tracking-tight text-foreground">
                    € 1.452,00
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    te betalen · uiterlijk 31 jan. 2027
                  </p>
                </div>
                <dl className="space-y-1 border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                  <div className="flex justify-between">
                    <dt>Btw over omzet (1a)</dt>
                    <dd className="font-mono">€ 1.764,00</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Voorbelasting (5b)</dt>
                    <dd className="font-mono">− € 312,00</dd>
                  </div>
                </dl>
              </div>

              {/* Receipt that came in via WhatsApp */}
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MessageCircle className="size-3.5 text-emerald-500" />
                    Bonnetje via WhatsApp
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    Te controleren
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">
                    Bouwmarkt
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Materialen · kabel en wandcontactdozen
                  </p>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-lg font-bold text-foreground">
                    € 96,80
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    incl. € 16,80 btw
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                  Winkel, datum, bedrag en btw automatisch uitgelezen.
                </p>
              </div>

              {/* Invoice paid via iDEAL */}
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileCheck2 className="size-3.5 text-emerald-500" />
                    Factuur 2026-042
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Betaald
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">
                    Fam. de Vries
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Groepenkast vervangen
                  </p>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-lg font-bold text-foreground">
                    € 1.452,00
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    incl. 21% btw
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 pt-1 border-t border-border/40">
                  <QrCode className="size-3" />
                  <span>Betaald via iDEAL-QR op locatie</span>
                </div>
              </div>
            </div>
            <p className="pt-4 text-center text-[10px] text-muted-foreground">
              Voorbeeldgegevens. In de app zie je je eigen cijfers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
