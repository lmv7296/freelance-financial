"use client";

import {
  Building2,
  Check,
  Eye,
  FileText,
  MapPin,
  Receipt,
  ShieldCheck,
  Smartphone,
  User,
} from "lucide-react";
import { useState } from "react";
import { DEFAULT_LINE_ITEMS } from "@/data/invoices";
import { calculateLineItemsTotals, formatEuro } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";

/**
 * ClientInvoicePreview: Reusable building block component for previewing
 * how the customer receives an official invoice, digital payment link, or PIN receipt.
 *
 * @param {object} props
 * @param {object} props.formValues - Current form or invoice values.
 */
export function ClientInvoicePreview({ formValues = {} }) {
  const [activeTab, setActiveTab] = useState("factuur");

  const isBedrijf = formValues.clientType === "bedrijf";
  const clientName = isBedrijf
    ? formValues.companyName?.trim() || "Zakelijke Opdrachtgever"
    : formValues.clientName?.trim() || "Particuliere Klant";

  const clientEmail = isBedrijf
    ? formValues.companyEmail || "facturen@opdrachtgever.nl"
    : formValues.clientEmail || "klant@email.nl";

  const clientPhone = isBedrijf
    ? formValues.companyPhone || "+31 20 891 0022"
    : formValues.clientPhone || "+31 6 12345678";

  const clientAddress = isBedrijf
    ? formValues.companyAddress || "Vestigingsadres conform dossier"
    : formValues.clientAddress || "Locatie conform werkbon";

  const invoiceNumber = formValues.invoiceNumber?.trim() || "INV-2047";
  const tradeType = formValues.tradeType || "Electrician";
  const dueDate = formValues.due || "Binnen 14 dagen";
  const method = formValues.method || "Tikkie / iDEAL QR";
  const status = formValues.status || "Pending";

  const isTikkie =
    method.toLowerCase().includes("tikkie") ||
    method.toLowerCase().includes("ideal");
  const isPin =
    method.toLowerCase().includes("pin") ||
    method.toLowerCase().includes("contant");

  const items =
    Array.isArray(formValues.items) && formValues.items.length > 0
      ? formValues.items
      : DEFAULT_LINE_ITEMS;

  const vatRate = Number.parseFloat(formValues.vatRate || "21") || 0;
  const { subtotal, vatAmount, total } = calculateLineItemsTotals(
    items,
    vatRate,
  );

  const formattedTotal = formatEuro(total);
  const formattedSubtotal = formatEuro(subtotal);
  const formattedVat = formatEuro(vatAmount);

  return (
    <div className="space-y-4">
      {/* Top Banner with Navigation Tabs between Official Invoice, Mobile Screen and Receipt */}
      <div className="rounded-xl border border-indigo-500/25 bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs shrink-0">
            <Eye className="size-4" />
          </div>
          <div>
            <p className="font-bold text-foreground">Live Klantvoorbeeld</p>
            <p className="text-[11px] text-muted-foreground">
              Officiële factuur en betaalmodule voor {clientName}.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs: Officiële factuur is standaard en altijd zichtbaar */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("factuur")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeTab === "factuur"
                ? "bg-background text-foreground shadow-2xs font-bold border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FileText className="size-3.5 text-primary" />
            <span>Officiële Factuur</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mobile")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeTab === "mobile"
                ? "bg-background text-foreground shadow-2xs font-bold border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Smartphone className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Klant Smartphone</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("receipt")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeTab === "receipt"
                ? "bg-background text-foreground shadow-2xs font-bold border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Receipt className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span>PIN Kwitantie</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: ALWAYS-AVAILABLE OFFICIAL FACTUUR DOCUMENT (A4 Format) */}
      {activeTab === "factuur" && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-xl space-y-5 text-xs transition-all">
          {/* Top Invoice Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-border/70">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs">
                  FF
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight leading-tight">
                    Freelance Financial
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Vakmanschap & Installatietechniek
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Singel 412, 1016 AK Amsterdam • KvK: 78291044 • BTW:
                NL859201948B01
              </p>
            </div>

            <div className="sm:text-right space-y-1">
              <div className="flex sm:justify-end items-center gap-2">
                <span className="text-lg font-extrabold font-mono tracking-tight text-foreground">
                  FACTUUR #{invoiceNumber}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  {status}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Factuurdatum:{" "}
                <strong className="text-foreground">25 okt 2026</strong>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Vervaldatum:{" "}
                <strong className="text-foreground">{dueDate}</strong>
              </p>
            </div>
          </div>

          {/* Parties & Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-1">
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                {isBedrijf ? (
                  <Building2 className="size-3 text-primary" />
                ) : (
                  <User className="size-3 text-primary" />
                )}
                Gefactureerd aan (Klant):
              </p>
              <p className="font-bold text-foreground text-sm leading-tight">
                {clientName}
              </p>
              {isBedrijf && formValues.contactPerson && (
                <p className="text-muted-foreground text-[11px]">
                  T.a.v. {formValues.contactPerson}
                </p>
              )}
              {isBedrijf && formValues.vatNumber && (
                <p className="text-muted-foreground text-[11px] font-mono">
                  BTW-id: {formValues.vatNumber}
                  {formValues.kvkNumber
                    ? ` • KvK: ${formValues.kvkNumber}`
                    : ""}
                </p>
              )}
              <p className="text-muted-foreground text-[11px] flex items-center gap-1.5 pt-0.5">
                <MapPin className="size-3 text-muted-foreground/70 shrink-0" />
                <span>{clientAddress}</span>
              </p>
              {(clientEmail || clientPhone) && (
                <p className="text-[11px] text-muted-foreground font-mono">
                  {clientEmail} • {clientPhone}
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5 sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Factuurspecificaties & Betaling:
              </p>
              <p className="text-muted-foreground text-[11px]">
                Vakgebied:{" "}
                <strong className="text-foreground">{tradeType}</strong>
              </p>
              <p className="text-muted-foreground text-[11px]">
                Geselecteerde betaalmethode:{" "}
                <strong className="text-foreground">{method}</strong>
              </p>
              <p className="text-muted-foreground text-[11px]">
                Valuta:{" "}
                <span className="font-mono font-semibold text-foreground">
                  EUR (€)
                </span>
              </p>
            </div>
          </div>

          {/* Itemized Table with all Split Items */}
          <div className="rounded-xl border border-border/70 overflow-hidden shadow-2xs">
            <table className="w-full text-left">
              <thead className="bg-muted/60 text-[10px] uppercase font-bold text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="p-2.5">
                    Omschrijving Werkzaamheden / Materialen
                  </th>
                  <th className="p-2.5 text-center w-20">Aantal / Uur</th>
                  <th className="p-2.5 text-right w-24">Prijs per eenheid</th>
                  <th className="p-2.5 text-right w-16">BTW</th>
                  <th className="p-2.5 text-right w-28">Totaal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {items.map((it, idx) => {
                  const q = Number.parseFloat(it.quantity) || 0;
                  const p =
                    Number.parseFloat(
                      String(it.unitPrice)
                        .replace(/[^0-9.,]/g, "")
                        .replace(",", "."),
                    ) || 0;
                  const lineTotal = q * p;

                  return (
                    <tr key={it.id || idx} className="hover:bg-muted/20">
                      <td className="p-2.5">
                        <p className="font-semibold text-foreground">
                          {it.description || "Geleverde werkzaamheden"}
                        </p>
                      </td>
                      <td className="p-2.5 text-center font-mono text-muted-foreground">
                        {q}
                      </td>
                      <td className="p-2.5 text-right font-mono text-muted-foreground">
                        €{p.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-muted-foreground">
                        {vatRate}%
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-foreground tabular-nums">
                        €{lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Subtotal & Total Breakdown */}
          <div className="flex flex-col items-end gap-1.5 pt-1 font-mono text-xs">
            <div className="flex justify-between w-72 text-muted-foreground">
              <span>Subtotaal excl. BTW:</span>
              <span className="tabular-nums font-semibold">
                {formattedSubtotal}
              </span>
            </div>
            <div className="flex justify-between w-72 text-muted-foreground">
              <span>BTW ({vatRate}%):</span>
              <span className="tabular-nums font-semibold">{formattedVat}</span>
            </div>
            <div className="flex justify-between w-72 text-sm font-bold text-foreground border-t border-border/80 pt-2 mt-0.5">
              <span>Totaal te voldoen:</span>
              <span className="tabular-nums text-lg text-primary">
                {formattedTotal}
              </span>
            </div>
          </div>

          {/* INTEGRATED PAYMENT MODULE ON THE OFFICIAL INVOICE */}
          {isTikkie ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex size-14 items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-emerald-500/30 p-1.5 shrink-0 shadow-2xs">
                  <div className="grid grid-cols-3 gap-0.5 size-full">
                    <div className="bg-foreground rounded-2xs" />
                    <div className="bg-foreground rounded-2xs" />
                    <div className="bg-transparent" />
                    <div className="bg-foreground rounded-2xs" />
                    <div className="bg-transparent" />
                    <div className="bg-foreground rounded-2xs" />
                    <div className="bg-foreground rounded-2xs" />
                    <div className="bg-foreground rounded-2xs" />
                    <div className="bg-foreground rounded-2xs" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                    <ShieldCheck className="size-3" /> Direct betalen via iDEAL
                    QR / Tikkie
                  </span>
                  <p className="font-bold text-foreground text-xs">
                    Scan met uw bank-app of camera
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Ondersteunt alle Nederlandse banken • Kenmerk:{" "}
                    {invoiceNumber}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1 shrink-0 w-full sm:w-auto">
                <div className="h-9 px-4 rounded-xl bg-[#008855] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs select-none">
                  <span className="font-extrabold tracking-wide">iDEAL</span>
                  Betaal {formattedTotal}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Veilig via bunq, ING, Rabo, ABN AMRO
                </p>
              </div>
            </div>
          ) : isPin ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                  <Check className="size-5" />
                </div>
                <div>
                  <p className="font-bold text-foreground">
                    Voldaan per {method}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Transactie geautoriseerd op Mobiele PIN Terminal #7741 •
                    Factuur dient als geldig BTW-bewijs.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                Transactie Akkoord
              </span>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-[11px] text-muted-foreground space-y-1.5">
              <p className="font-bold text-foreground text-xs">
                Betaalinstructies Bankoverschrijving:
              </p>
              <p>
                Gelieve het factuurbedrag van{" "}
                <strong className="text-foreground">{formattedTotal}</strong>{" "}
                vóór <strong className="text-foreground">{dueDate}</strong> over
                te maken naar onderstaande rekening:
              </p>
              <p className="font-mono text-foreground font-semibold text-xs">
                IBAN: NL91 ABNA 0412 8899 00 • t.n.v. Freelance Financial •
                o.v.v. {invoiceNumber}
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SMARTPHONE VIEW (Mobile preview for the client) */}
      {activeTab === "mobile" && (
        <div className="mx-auto max-w-sm rounded-3xl border border-border/80 bg-card p-5 shadow-xl space-y-4 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />

          {/* Sender Header */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs">
                FF
              </div>
              <div>
                <p className="text-xs font-bold text-foreground leading-tight">
                  Freelance Financial
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="size-3 text-emerald-500" />
                  Geverifieerd betaalverzoek
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              iDEAL QR
            </span>
          </div>

          {/* Amount Hero */}
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-center space-y-1.5">
            <p className="text-[11px] text-muted-foreground">
              Betaalverzoek voor{" "}
              <strong className="text-foreground">{clientName}</strong>
            </p>
            <p className="text-3xl font-extrabold tracking-tight font-mono text-foreground tabular-nums">
              {formattedTotal}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              Factuur #{invoiceNumber} • incl. {vatRate}% BTW
            </p>
          </div>

          {/* Line items on mobile screen */}
          <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Factuurregels ({items.length})
            </p>
            <div className="divide-y divide-border/40 text-xs">
              {items.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-foreground truncate">
                      {it.description || "Werkzaamheden"}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {it.quantity} × €{it.unitPrice}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-foreground shrink-0 tabular-nums">
                    €
                    {(
                      (Number.parseFloat(it.quantity) || 0) *
                      (Number.parseFloat(
                        String(it.unitPrice)
                          .replace(/[^0-9.,]/g, "")
                          .replace(",", "."),
                      ) || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* QR Code Pod */}
          <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-border/60 bg-white dark:bg-zinc-900 text-center space-y-2">
            <div className="flex size-24 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 p-2 border border-border">
              <div className="grid grid-cols-4 gap-1 size-full p-1 bg-white dark:bg-zinc-900 rounded-sm">
                <div className="bg-foreground rounded-xs" />
                <div className="bg-foreground rounded-xs" />
                <div className="bg-transparent" />
                <div className="bg-foreground rounded-xs" />
                <div className="bg-foreground rounded-xs" />
                <div className="bg-transparent" />
                <div className="bg-foreground rounded-xs" />
                <div className="bg-foreground rounded-xs" />
                <div className="bg-transparent" />
                <div className="bg-foreground rounded-xs" />
                <div className="bg-foreground rounded-xs" />
                <div className="bg-transparent" />
                <div className="bg-foreground rounded-xs" />
                <div className="bg-foreground rounded-xs" />
                <div className="bg-transparent" />
                <div className="bg-foreground rounded-xs" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Scan met smartphone camera of bank-app
            </p>
          </div>

          {/* Action Button */}
          <div className="space-y-2 pt-1">
            <div className="w-full py-2.5 px-4 rounded-xl bg-[#008855] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm select-none">
              <span className="font-extrabold tracking-wide">iDEAL</span>
              Betaal direct {formattedTotal}
            </div>
            <p className="text-[10px] text-center text-muted-foreground">
              Vervalt op {dueDate} • Veilig via alle banken
            </p>
          </div>
        </div>
      )}

      {/* VIEW 3: PIN RECEIPT VIEW */}
      {activeTab === "receipt" && (
        <div className="mx-auto max-w-sm rounded-2xl border border-border/80 bg-card p-5 shadow-lg space-y-3.5 transition-all">
          <div className="text-center space-y-1 pb-2 border-b border-dashed border-border">
            <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
              Betalingsbewijs • Kwitantie
            </p>
            <h4 className="text-sm font-bold text-foreground">
              Freelance Financial
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Terminal: Mobiel Pinapparaat #7741
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Factuurnummer:</span>
              <strong className="text-foreground font-mono">
                #{invoiceNumber}
              </strong>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Klant:</span>
              <strong className="text-foreground">{clientName}</strong>
            </div>
            <div className="space-y-1 pt-1 border-t border-border/40">
              <span className="text-[11px] text-muted-foreground">
                Regels ({items.length}):
              </span>
              {items.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="flex justify-between text-muted-foreground text-[11px]"
                >
                  <span className="truncate max-w-44">
                    {it.description || "Item"}
                  </span>
                  <span className="font-mono text-foreground font-semibold">
                    {it.quantity} × €{it.unitPrice}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/40">
              <span>Betaalwijze:</span>
              <span className="text-foreground font-medium">{method}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Status:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="size-3" /> Transactie Akkoord
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-dashed border-border flex items-baseline justify-between">
            <span className="text-xs font-bold text-foreground uppercase">
              Totaal Voldaan
            </span>
            <span className="text-xl font-bold font-mono text-foreground tabular-nums">
              {formattedTotal}
            </span>
          </div>

          <p className="text-[10px] text-center text-muted-foreground italic pt-1">
            Dank voor uw betaling. Dit digitale bewijs is geldig voor uw
            administratie.
          </p>
        </div>
      )}
    </div>
  );
}
