"use client";

import {
  ArrowRight,
  CheckCircle,
  CreditCard,
  FileCheck2,
  Plus,
  QrCode,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";

export function LandingHero() {
  const { isAuthenticated, user, openLogin, openRegister } = useAuth();

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[1000px] h-[550px] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Trust pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/25 bg-primary/10 text-primary text-xs font-semibold shadow-2xs backdrop-blur-sm">
            <Sparkles className="size-3.5" />
            <span>Financieel beheer voor de Nederlandse Vakman & ZZP'er</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            Financiële rust tussen{" "}
            <span className="bg-gradient-to-r from-primary via-emerald-600 to-primary bg-clip-text text-transparent">
              klussen door.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Stop met administratie op zondagavond. Maak professionele facturen
            in 60 seconden vanuit je bus, laat klanten direct per iDEAL betalen
            en reserveer automatisch 21% BTW voor de Belastingdienst.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            {isAuthenticated ? (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button
                  size="lg"
                  asChild
                  className="rounded-full px-7 font-bold shadow-md hover:shadow-lg cursor-pointer"
                >
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <span>Ga naar Dashboard ({user?.email})</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="rounded-full px-6"
                >
                  <Link href="/invoices">Nieuwe Factuur Maken</Link>
                </Button>
              </div>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={openRegister}
                  className="w-full sm:w-auto rounded-full px-8 font-bold shadow-md hover:shadow-lg active:scale-98 transition-all cursor-pointer h-12"
                >
                  <span>Direct gratis starten</span>
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
                <Button
                  variant="ghost"
                  size="lg"
                  asChild
                  className="w-full sm:w-auto rounded-full px-6 text-muted-foreground hover:text-foreground h-12"
                >
                  <a href="#features">Bekijk alle functies</a>
                </Button>
              </>
            )}
          </div>

          {/* Micro badges below CTA */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="size-3.5 text-emerald-500" />
              Geen ingewikkelde boekhoudtermen
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="size-3.5 text-emerald-500" />
              iDEAL & QR direct op de bouwplaats
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="size-3.5 text-emerald-500" />
              Automatische BTW-Kluis
            </span>
          </div>
        </div>

        {/* Live UI Interactive Showcase Mockup */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="relative rounded-3xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl p-4 sm:p-7 overflow-hidden">
            {/* Top Bar of the Mockup */}
            <div className="flex items-center justify-between pb-5 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-xs">
                  <CreditCard className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    FreelanceFin Werkplek
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Dennis van Dam • Elektrotechniek & Installatie
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Demo Sync
              </span>
            </div>

            {/* Mockup Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
              {/* Card 1: BTW-Kluis */}
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Wallet className="size-3.5 text-primary" />
                    BTW-Kluis Q4
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    75% gedekt
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-extrabold tracking-tight text-foreground">
                    €3.712,00
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    van €4.950 gereserveerd voor Belastingdienst
                  </p>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden border border-border/40">
                  <div className="h-full bg-emerald-500 rounded-full w-3/4" />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Gereserveerd van 14 voldane facturen.
                </p>
              </div>

              {/* Card 2: Recente Factuur */}
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileCheck2 className="size-3.5 text-emerald-500" />
                    Laatste Factuur
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Betaald
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">
                    Fam. Van Leeuwen
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Groepenkast vernieuwen & laadpaal
                  </p>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-lg font-bold text-foreground">
                    €1.485,25
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Factuur #2026-042
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 pt-1 border-t border-border/40">
                  <QrCode className="size-3" />
                  <span>Betaald via mobiele QR op locatie</span>
                </div>
              </div>

              {/* Card 3: Maandomzet & Snel Factureren */}
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-primary" />
                    Oktober Omzet
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-600">
                    +18%
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight text-foreground">
                    €17.680,00
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Excl. BTW over 18 opdrachten
                  </p>
                </div>
                <Button
                  size="sm"
                  asChild
                  className="w-full rounded-xl text-xs font-semibold justify-center gap-1.5 cursor-pointer"
                >
                  <Link href="/invoices">
                    <Plus className="size-3.5" />
                    <span>Nieuwe factuur opstellen</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
