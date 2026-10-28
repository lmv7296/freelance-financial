"use client";

import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  FileText,
  MoreVertical,
  Plus,
  QrCode,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TimeFilterDropdown } from "@/components/TimeFilterDropdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  const [revenuePeriod, setRevenuePeriod] = useState("30d");
  const [copiedId, setCopiedId] = useState(null);

  const revenueData = {
    "30d": {
      value: "€14.850,00",
      trend: "+14.2%",
      trendLabel: "t.o.v. vorige maand",
      description: "Netto gefactureerd & ontvangen (afgelopen 30 dagen)",
      netto: "€11.137,50",
      taxVault: "€3.712,50",
    },
    "90d": {
      value: "€42.120,00",
      trend: "+21.5%",
      trendLabel: "t.o.v. vorig kwartaal",
      description: "Netto gefactureerd & ontvangen (afgelopen 90 dagen)",
      netto: "€31.590,00",
      taxVault: "€10.530,00",
    },
    "6m": {
      value: "€81.400,00",
      trend: "+18.8%",
      trendLabel: "t.o.v. voorgaande 6 mnd",
      description: "Netto gefactureerd & ontvangen (afgelopen 6 maanden)",
      netto: "€61.050,00",
      taxVault: "€20.350,00",
    },
    "12m": {
      value: "€156.200,00",
      trend: "+31.4%",
      trendLabel: "t.o.v. voorgaand jaar",
      description: "Netto gefactureerd & ontvangen (afgelopen 12 maanden)",
      netto: "€117.150,00",
      taxVault: "€39.050,00",
    },
  };

  const currentRevenue = revenueData[revenuePeriod] || revenueData["30d"];

  const handleCopyTikkie = (id) => {
    setCopiedId(id);
    navigator.clipboard?.writeText(`https://pay.tikkie.me/trade/${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 space-y-6 font-sans">
      {/* 1. Page Header & Live Domain Identity */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Administratie • Q4 2026
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              KvK 78291044
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Financieel Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Realtime overzicht van installatieopdrachten, marktomzet,
            BTW-reserve en openstaande betalingen.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => alert("Exporteren van BTW-rapportage (Q4)...")}
            className="rounded-full px-4 shadow-2xs hover:bg-muted/70 active:scale-[0.97] transition-all font-medium text-xs h-9 cursor-pointer"
          >
            <Download className="size-3.5 mr-1.5" />
            BTW-Overzicht
          </Button>

          <Button
            onClick={() => window.location.assign("/invoices")}
            className="rounded-full px-4.5 shadow-sm hover:shadow-md active:scale-[0.97] transition-all font-semibold text-xs h-9 cursor-pointer"
          >
            <Plus className="size-4 mr-1.5" />
            Nieuwe Factuur / Verzoek
          </Button>
        </div>
      </div>

      {/* 2. Hero as Thesis: Netto Saldo vs Belastingkluis (Answering the #1 Contractor Anxiety) */}
      <div className="rounded-3xl border border-border/80 dark:border-white/[0.08] bg-gradient-to-br from-card via-card/90 to-muted/30 p-5 sm:p-6 shadow-xs backdrop-blur-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Direct Beschikbaar & Veilig Saldo
            </span>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono tabular-nums">
                {currentRevenue.netto}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                <TrendingUp className="size-3.5" />
                Vrij besteedbaar
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Dit bedrag is 100% van jou na aftrek van {currentRevenue.taxVault}{" "}
              voor de Belastingdienst.
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/invoices">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full gap-1.5 font-semibold text-xs h-8.5 active:scale-[0.97]"
              >
                <QrCode className="size-3.5 text-primary" />
                Tikkie / iDEAL QR
              </Button>
            </Link>
            <Link href="/clients">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-1.5 font-semibold text-xs h-8.5 active:scale-[0.97]"
              >
                <Users className="size-3.5" />
                Klanten Dossier
              </Button>
            </Link>
          </div>
        </div>

        {/* Breakdown bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" />
              Netto Arbeid & Winst (75%)
            </span>
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" />
              BTW-Kluis & Belastingreserve (25%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex p-0.5 border border-border/50">
            <div className="h-full bg-primary rounded-l-full w-3/4" />
            <div className="h-full bg-amber-500 rounded-r-full w-1/4" />
          </div>
        </div>
      </div>

      {/* 3. Row 1: Asymmetric Bento Grid Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric Card 1: Revenue with Time Filter Dropdown */}
        <Card
          title="Bruto Omzet"
          description={currentRevenue.description}
          value={currentRevenue.value}
          trend={currentRevenue.trend}
          trendLabel={currentRevenue.trendLabel}
          icon={<Wallet className="size-5" />}
          iconColor="primary"
          headerAction={
            <TimeFilterDropdown
              value={revenuePeriod}
              onChange={(id) => setRevenuePeriod(id)}
            />
          }
          variant="elevated"
        />

        {/* Metric Card 2: Pending Payments */}
        <Card
          title="Openstaand Saldo"
          description="3 facturen & PIN-orders in afwachting"
          value="€4.090,00"
          trend="Vervaltijd 12-14 dgn"
          trendDirection="neutral"
          icon={<FileText className="size-5" />}
          iconColor="amber"
          variant="elevated"
        />

        {/* Metric Card 3: Active Customers */}
        <Card
          title="Actieve Klanten"
          description="Particulieren, marktkramen & VvE-panden"
          value="48 dossiers"
          trend="+5"
          trendLabel="nieuw deze maand"
          icon={<Users className="size-5" />}
          iconColor="blue"
          variant="elevated"
        />

        {/* Metric Card 4: Quick Action Tile */}
        <Card
          title="Snelle Factuur / Verzoek"
          description="Maak binnen 30 sec een betaalverzoek"
          interactive
          variant="elevated"
          onClick={() => window.location.assign("/invoices")}
          footer="Direct synchroniseren met BTW"
          footerActions={
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-xs font-semibold hover:bg-primary/10 active:scale-[0.97] transition-all"
            >
              Start <ArrowUpRight className="size-3.5 ml-1" />
            </Button>
          }
        >
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Genereer ter plaatse PIN-kwitanties, Tikkie iDEAL QR of zakelijke
            BTW-facturen.
          </p>
        </Card>
      </div>

      {/* 4. Row 2: Live Invoices Table & Tax Vault Deep Dive */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Card 5: Recent Invoices & Takings */}
        <div className="lg:col-span-2">
          <Card
            title="Recente Facturen & Werkopdrachten"
            description="Laatste installaties, marktomzet en overschrijvingen"
            headerAction={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground hover:bg-muted"
                title="Opties"
              >
                <MoreVertical className="size-4" />
              </Button>
            }
            variant="elevated"
            footer="Automatisch gesynchroniseerd met je dossier"
            footerActions={
              <Link href="/invoices">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs font-medium active:scale-[0.97]"
                >
                  Alles Bekijken
                </Button>
              </Link>
            }
          >
            <div className="divide-y divide-border/40">
              {[
                {
                  client: "Mark & Sophie van Beek",
                  tag: "Elektricien",
                  id: "INV-2044",
                  desc: "3-Fasen Groepenkast & EV Wallbox",
                  date: "Vandaag",
                  amount: "€1.450,00",
                  status: "Paid",
                  method: "Tikkie iDEAL QR",
                },
                {
                  client: "De Kaasboer (Marktkraam 14)",
                  tag: "Marktkoopman",
                  id: "INV-2045",
                  desc: "Weeklevering Boerenkaas Batch #42",
                  date: "Gisteren",
                  amount: "€1.240,00",
                  status: "Pending",
                  method: "PIN / Tap Terminal",
                },
                {
                  client: "Arthur & Claire Pendleton",
                  tag: "Loodgieter",
                  id: "INV-2041",
                  desc: "Spoedreparatie Leidingbreuk & Hoofdkraan",
                  date: "11 okt",
                  amount: "€480,00",
                  status: "Paid",
                  method: "Mobiele PIN",
                },
                {
                  client: "Koraal Vastgoedbeheer",
                  tag: "VvE Zakelijk",
                  id: "INV-2046",
                  desc: "NEN 3140 Periodieke Inspectie",
                  date: "10 okt",
                  amount: "€2.850,00",
                  status: "Pending",
                  method: "Factuur Net 30",
                },
              ].map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-3 hover:bg-muted/20 px-2 rounded-xl transition-colors group"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {inv.client}
                      </p>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-medium shrink-0">
                        {inv.tag}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      <span className="font-mono">{inv.id}</span> • {inv.desc} •{" "}
                      {inv.date}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="text-sm font-bold text-foreground font-mono tabular-nums">
                        {inv.amount}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          inv.status === "Paid"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${inv.status === "Paid" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}
                        />
                        {inv.status === "Paid" ? "Voldaan" : "In afwachting"}
                      </span>
                    </div>

                    {/* Copy Tikkie link button */}
                    <button
                      type="button"
                      onClick={() => handleCopyTikkie(inv.id)}
                      className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all cursor-pointer"
                      title="Kopieer betaallink"
                    >
                      {copiedId === inv.id ? (
                        <Check className="size-4 text-emerald-600" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Card 6: Tax Vault (BTW-Kluis Q4 & Belastingdienst Reserve) */}
        <Card
          title="BTW-Kluis & Belastingreserve"
          description="Vergrendeld voor Q4 Belastingdienst aangifte"
          variant="elevated"
          badge="Gereserveerd"
          badgeVariant="success"
          badgeDot
          footer="Berekend o.b.v. gefactureerde 21% & 9% BTW"
          footerActions={
            <Button
              size="sm"
              variant="outline"
              className="rounded-full text-xs font-semibold shadow-2xs active:scale-[0.97]"
            >
              Aanpassen
            </Button>
          }
        >
          <div className="space-y-4 py-2">
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono tabular-nums">
                €3.712,50
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatische reservering voor omzetbelasting en
                inkomstenbelasting.
              </p>
            </div>

            {/* Split Breakdown */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>BTW Hoog (21% Elektra/Uren):</span>
                <span className="font-bold text-foreground tabular-nums">
                  €2.820,00
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>BTW Laag (9% Isolatie/Food):</span>
                <span className="font-bold text-foreground tabular-nums">
                  €892,50
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Kwartaal buffer:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  75% gereed
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden p-0.5 border border-border/40">
                <div className="h-full bg-emerald-500 rounded-full w-3/4 shadow-xs" />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
              <span>
                Geen verrassingen bij je kwartaalaangifte op 31 januari.
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
