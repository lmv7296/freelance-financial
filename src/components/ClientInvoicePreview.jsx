"use client";

import {
  Building2,
  Check,
  Eye,
  FileText,
  MapPin,
  Receipt,
  Smartphone,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DEFAULT_LINE_ITEMS } from "@/data/invoices";
import { settingsApi } from "@/lib/api/settings";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatDate } from "@/lib/dateUtils";
import { calculateLineItemsTotals, formatEuro } from "@/lib/formatCurrency";
import { useT } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

const parsePrice = (value) =>
  Number.parseFloat(
    String(value)
      .replace(/[^0-9.,]/g, "")
      .replace(",", "."),
  ) || 0;

const initialsOf = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "?";

/**
 * Preview of how the client receives the invoice: the invoice itself, the payment
 * request on a phone, and the receipt. The sender details come from the user's
 * company settings (Settings → Company details); nothing is made up.
 *
 * @param {object} props
 * @param {object} props.formValues - Current form or invoice values.
 */
export function ClientInvoicePreview({ formValues = {} }) {
  const t = useT();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("factuur");
  const [company, setCompany] = useState(null);

  useEffect(() => {
    let cancelled = false;
    settingsApi
      .getCompany()
      .then((res) => {
        if (!cancelled) setCompany(res?.company ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const companyName =
    company?.trade_name || company?.company_name || user?.business_name || "";
  const senderName = companyName || t("invoicePreview.yourCompany");
  const senderAddress = [
    company?.street,
    [company?.postal_code, company?.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const senderIds = [
    company?.kvk_number &&
      t("invoicePreview.kvk", { number: company.kvk_number }),
    company?.vat_number &&
      t("invoicePreview.vat", { number: company.vat_number }),
  ].filter(Boolean);

  const isBedrijf = formValues.clientType === "bedrijf";
  const clientName = isBedrijf
    ? formValues.companyName?.trim() || t("invoicePreview.clientDefaultCompany")
    : formValues.clientName?.trim() || t("invoicePreview.clientDefaultPerson");
  const clientEmail = isBedrijf
    ? formValues.companyEmail
    : formValues.clientEmail;
  const clientPhone = isBedrijf
    ? formValues.companyPhone
    : formValues.clientPhone;
  const clientAddress =
    (isBedrijf ? formValues.companyAddress : formValues.clientAddress) ||
    t("invoicePreview.addressMissing");

  const invoiceNumber = formValues.invoiceNumber?.trim() || "INV-2047";
  const tradeKey = formValues.tradeType || "Electrician";
  const tradeLabel = t(`invoices.tradeTypes.${tradeKey}`);
  const trade = tradeLabel.startsWith("invoices.") ? tradeKey : tradeLabel;
  const dueDate = formValues.due ? formatDate(formValues.due) : "—";
  const method = t(formValues.method || "Tikkie / iDEAL QR");
  const status = formValues.status || "Pending";
  const statusLabel = t(`invoicePreview.status.${status}`);

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
  const lineDescription = (it) =>
    t(it.description) || t("invoicePreview.defaultLine");

  const vatRate = Number.parseFloat(formValues.vatRate || "21") || 0;
  const { subtotal, vatAmount, total } = calculateLineItemsTotals(
    items,
    vatRate,
  );

  const formattedTotal = formatEuro(total);

  const tabClass = (tab) =>
    cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
      activeTab === tab
        ? "bg-background text-foreground shadow-2xs font-bold border border-border"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="space-y-4">
      {/* Banner with tabs: invoice, phone view and receipt */}
      <div className="rounded-xl border border-border/80 bg-muted/30 p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-muted text-foreground shrink-0">
            <Eye className="size-4" />
          </div>
          <div>
            <p className="font-bold text-foreground">
              {t("invoicePreview.title")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t("invoicePreview.subtitle", { client: clientName })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("factuur")}
            className={tabClass("factuur")}
          >
            <FileText className="size-3.5 text-primary" />
            <span>{t("invoicePreview.tabInvoice")}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mobile")}
            className={tabClass("mobile")}
          >
            <Smartphone className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t("invoicePreview.tabMobile")}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("receipt")}
            className={tabClass("receipt")}
          >
            <Receipt className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span>{t("invoicePreview.tabReceipt")}</span>
          </button>
        </div>
      </div>

      {!companyName && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
          {t("invoicePreview.companyMissing")}
        </p>
      )}

      {/* VIEW 1: the invoice */}
      {activeTab === "factuur" && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-xl space-y-5 text-xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-border/70">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs">
                  {initialsOf(senderName)}
                </div>
                <h3 className="text-base font-bold text-foreground tracking-tight leading-tight">
                  {senderName}
                </h3>
              </div>
              {(senderAddress || senderIds.length > 0) && (
                <p className="text-[11px] text-muted-foreground pt-1">
                  {[senderAddress, ...senderIds].filter(Boolean).join(" • ")}
                </p>
              )}
            </div>

            <div className="sm:text-right space-y-1">
              <div className="flex sm:justify-end items-center gap-2">
                <span className="text-lg font-extrabold font-mono tracking-tight text-foreground">
                  {t("invoicePreview.invoiceNumber", { number: invoiceNumber })}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  {statusLabel}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t("invoicePreview.invoiceDate")}{" "}
                <strong className="text-foreground">
                  {formatDate(new Date())}
                </strong>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("invoicePreview.dueDate")}{" "}
                <strong className="text-foreground">{dueDate}</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-1">
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                {isBedrijf ? (
                  <Building2 className="size-3 text-primary" />
                ) : (
                  <User className="size-3 text-primary" />
                )}
                {t("invoicePreview.billedTo")}
              </p>
              <p className="font-bold text-foreground text-sm leading-tight">
                {clientName}
              </p>
              {isBedrijf && formValues.contactPerson && (
                <p className="text-muted-foreground text-[11px]">
                  {t("invoicePreview.attention", {
                    name: formValues.contactPerson,
                  })}
                </p>
              )}
              {isBedrijf && (formValues.vatNumber || formValues.kvkNumber) && (
                <p className="text-muted-foreground text-[11px] font-mono">
                  {[
                    formValues.vatNumber &&
                      t("invoicePreview.clientVat", {
                        number: formValues.vatNumber,
                      }),
                    formValues.kvkNumber &&
                      t("invoicePreview.clientKvk", {
                        number: formValues.kvkNumber,
                      }),
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              )}
              <p className="text-muted-foreground text-[11px] flex items-center gap-1.5 pt-0.5">
                <MapPin className="size-3 text-muted-foreground/70 shrink-0" />
                <span>{clientAddress}</span>
              </p>
              {(clientEmail || clientPhone) && (
                <p className="text-[11px] text-muted-foreground font-mono">
                  {[clientEmail, clientPhone].filter(Boolean).join(" • ")}
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5 sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("invoicePreview.details")}
              </p>
              <p className="text-muted-foreground text-[11px]">
                {t("invoicePreview.trade")}{" "}
                <strong className="text-foreground">{trade}</strong>
              </p>
              <p className="text-muted-foreground text-[11px]">
                {t("invoicePreview.method")}{" "}
                <strong className="text-foreground">{method}</strong>
              </p>
              <p className="text-muted-foreground text-[11px]">
                {t("invoicePreview.currency")}{" "}
                <span className="font-mono font-semibold text-foreground">
                  EUR (€)
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 overflow-hidden shadow-2xs">
            <table className="w-full text-left">
              <thead className="bg-muted/60 text-[10px] uppercase font-bold text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="p-2.5">
                    {t("invoicePreview.colDescription")}
                  </th>
                  <th className="p-2.5 text-center w-20">
                    {t("invoicePreview.colQuantity")}
                  </th>
                  <th className="p-2.5 text-right w-24">
                    {t("invoicePreview.colPrice")}
                  </th>
                  <th className="p-2.5 text-right w-16">
                    {t("invoicePreview.colVat")}
                  </th>
                  <th className="p-2.5 text-right w-28">
                    {t("invoicePreview.colTotal")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {items.map((it, idx) => {
                  const quantity = Number.parseFloat(it.quantity) || 0;
                  const price = parsePrice(it.unitPrice);
                  return (
                    <tr key={it.id || idx} className="hover:bg-muted/20">
                      <td className="p-2.5">
                        <p className="font-semibold text-foreground">
                          {lineDescription(it)}
                        </p>
                      </td>
                      <td className="p-2.5 text-center font-mono text-muted-foreground">
                        {quantity}
                      </td>
                      <td className="p-2.5 text-right font-mono text-muted-foreground">
                        {formatEuro(price)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-muted-foreground">
                        {vatRate}%
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-foreground tabular-nums">
                        {formatEuro(quantity * price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-end gap-1.5 pt-1 font-mono text-xs">
            <div className="flex justify-between w-72 text-muted-foreground">
              <span>{t("invoicePreview.subtotal")}</span>
              <span className="tabular-nums font-semibold">
                {formatEuro(subtotal)}
              </span>
            </div>
            <div className="flex justify-between w-72 text-muted-foreground">
              <span>{t("invoicePreview.vatLine", { rate: vatRate })}</span>
              <span className="tabular-nums font-semibold">
                {formatEuro(vatAmount)}
              </span>
            </div>
            <div className="flex justify-between w-72 text-sm font-bold text-foreground border-t border-border/80 pt-2 mt-0.5">
              <span>{t("invoicePreview.total")}</span>
              <span className="tabular-nums text-lg text-primary">
                {formattedTotal}
              </span>
            </div>
          </div>

          {/* How the client pays */}
          {isTikkie ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                  {t("invoicePreview.idealTitle")}
                </span>
                <p className="font-bold text-foreground text-xs">
                  {t("invoicePreview.idealScan")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t("invoicePreview.idealReference", {
                    number: invoiceNumber,
                  })}
                </p>
              </div>
              <div className="flex flex-col sm:items-end gap-1 shrink-0 w-full sm:w-auto">
                <div className="h-9 px-4 rounded-xl bg-[#008855] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs select-none">
                  {t("invoicePreview.idealPay", { amount: formattedTotal })}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {t("invoicePreview.idealBanks")}
                </p>
              </div>
            </div>
          ) : isPin ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3 text-xs">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Check className="size-5" />
              </div>
              <p className="font-bold text-foreground">
                {t("invoicePreview.paidBy", { method })}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-[11px] text-muted-foreground space-y-1.5">
              <p className="font-bold text-foreground text-xs">
                {t("invoicePreview.transferTitle")}
              </p>
              <p>
                {t("invoicePreview.transferText", {
                  amount: formattedTotal,
                  date: dueDate,
                })}
              </p>
              <p className="font-mono text-foreground font-semibold text-xs">
                {company?.iban
                  ? t("invoicePreview.transferIban", {
                      iban: company.iban,
                      name: senderName,
                      number: invoiceNumber,
                    })
                  : t("invoicePreview.ibanMissing")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: payment request on the client's phone */}
      {activeTab === "mobile" && (
        <div className="mx-auto max-w-sm rounded-3xl border border-border/80 bg-card p-5 shadow-xl space-y-4 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs">
                {initialsOf(senderName)}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground leading-tight">
                  {senderName}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t("invoicePreview.paymentRequest")}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              iDEAL
            </span>
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-center space-y-1.5">
            <p className="text-[11px] text-muted-foreground">
              {t("invoicePreview.requestFor", { client: clientName })}
            </p>
            <p className="text-3xl font-extrabold tracking-tight font-mono text-foreground tabular-nums">
              {formattedTotal}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {t("invoicePreview.inclVat", {
                number: invoiceNumber,
                rate: vatRate,
              })}
            </p>
          </div>

          <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("invoicePreview.lines", { count: items.length })}
            </p>
            <div className="divide-y divide-border/40 text-xs">
              {items.map((it, idx) => {
                const quantity = Number.parseFloat(it.quantity) || 0;
                const price = parsePrice(it.unitPrice);
                return (
                  <div
                    key={it.id || idx}
                    className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-foreground truncate">
                        {lineDescription(it)}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {quantity} × {formatEuro(price)}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-foreground shrink-0 tabular-nums">
                      {formatEuro(quantity * price)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-center text-muted-foreground">
            {t("invoicePreview.scanHint")}
          </p>

          <div className="space-y-2">
            <div className="w-full py-2.5 px-4 rounded-xl bg-[#008855] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm select-none">
              {t("invoicePreview.payNow", { amount: formattedTotal })}
            </div>
            <p className="text-[10px] text-center text-muted-foreground">
              {t("invoicePreview.dueOn", { date: dueDate })}
            </p>
          </div>
        </div>
      )}

      {/* VIEW 3: receipt */}
      {activeTab === "receipt" && (
        <div className="mx-auto max-w-sm rounded-2xl border border-border/80 bg-card p-5 shadow-lg space-y-3.5 transition-all">
          <div className="text-center space-y-1 pb-2 border-b border-dashed border-border">
            <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
              {t("invoicePreview.receiptTitle")}
            </p>
            <h4 className="text-sm font-bold text-foreground">{senderName}</h4>
            {senderAddress && (
              <p className="text-[11px] text-muted-foreground">
                {senderAddress}
              </p>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>{t("invoicePreview.receiptNumber")}</span>
              <strong className="text-foreground font-mono">
                {invoiceNumber}
              </strong>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{t("invoicePreview.receiptClient")}</span>
              <strong className="text-foreground">{clientName}</strong>
            </div>
            <div className="space-y-1 pt-1 border-t border-border/40">
              <span className="text-[11px] text-muted-foreground">
                {t("invoicePreview.receiptLines", { count: items.length })}
              </span>
              {items.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="flex justify-between text-muted-foreground text-[11px]"
                >
                  <span className="truncate max-w-44">
                    {lineDescription(it)}
                  </span>
                  <span className="font-mono text-foreground font-semibold">
                    {Number.parseFloat(it.quantity) || 0} ×{" "}
                    {formatEuro(parsePrice(it.unitPrice))}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/40">
              <span>{t("invoicePreview.receiptMethod")}</span>
              <span className="text-foreground font-medium">{method}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{t("invoicePreview.receiptStatus")}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="size-3" /> {t("invoicePreview.receiptPaid")}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-dashed border-border flex items-baseline justify-between">
            <span className="text-xs font-bold text-foreground uppercase">
              {t("invoicePreview.receiptTotal")}
            </span>
            <span className="text-xl font-bold font-mono text-foreground tabular-nums">
              {formattedTotal}
            </span>
          </div>

          <p className="text-[10px] text-center text-muted-foreground pt-1">
            {t("invoicePreview.thanks")}
          </p>
        </div>
      )}
    </div>
  );
}
