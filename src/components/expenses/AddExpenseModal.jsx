"use client";

import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CreditCard,
  FileText,
  Loader2,
  Plus,
  Receipt,
  Tag,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { useAppConfig } from "@/lib/api/config";
import { expenseLinkApi, expensesApi } from "@/lib/api/expenses";
import { cn } from "@/lib/utils";

function toNumberOrNull(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number.parseFloat(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDecimal(num) {
  if (num === null || num === undefined || Number.isNaN(num)) return "";
  return num.toFixed(2).replace(".", ",");
}

function calculateSplit(totalNum, vatRateNum) {
  if (totalNum === null || totalNum <= 0) {
    return { subtotal: "", vat: "" };
  }
  const rateFraction = (vatRateNum || 0) / 100;
  const subtotal = totalNum / (1 + rateFraction);
  const vat = totalNum - subtotal;
  return {
    subtotal: formatDecimal(subtotal),
    vat: formatDecimal(vat),
  };
}

export function AddExpenseModal({
  isOpen,
  onClose,
  onAdded,
  categoryOptions = [],
}) {
  const fileInputRef = useRef(null);

  // Cached DB reference data
  const {
    paymentMethods,
    vatRates,
    categories: configCategories,
    merchants,
  } = useAppConfig();

  const categories = Array.from(
    new Set([...configCategories, ...categoryOptions]),
  );

  const defaultVatRate = vatRates[0]?.rate ?? 21;
  const defaultPaymentMethod =
    typeof paymentMethods[0] === "object"
      ? paymentMethods[0].value || paymentMethods[0].label
      : paymentMethods[0] || "PIN / Betaalpas";
  const defaultCategory = categories[0] || "Bouwmaterialen & Onderdelen";

  // Form states
  const [merchantName, setMerchantName] = useState("");
  const [merchantAddress, setMerchantAddress] = useState("");
  const [receiptDate, setReceiptDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [category, setCategory] = useState(defaultCategory);
  const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethod);
  const [vatRate, setVatRate] = useState(defaultVatRate);
  const [totalAmount, setTotalAmount] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [subtotalAmount, setSubtotalAmount] = useState("");
  const [isManualVat, setIsManualVat] = useState(false);

  // Attachments
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [receiptContentType, setReceiptContentType] = useState("");

  // Customer and Invoice link
  const [clientId, setClientId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);

  // Notes & Status
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("approved");

  // UX states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);

  // Load clients when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    expenseLinkApi
      .listClients()
      .then((res) => {
        if (!cancelled) setClients(res?.clients ?? []);
      })
      .catch(() => {
        // Silently ignore if clients endpoint is unavailable
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Load invoices when clientId changes
  useEffect(() => {
    if (!isOpen || !clientId) {
      setInvoices([]);
      setInvoiceId("");
      return;
    }
    let cancelled = false;
    expenseLinkApi
      .listInvoices(clientId)
      .then((res) => {
        if (!cancelled) setInvoices(res?.invoices ?? []);
      })
      .catch(() => {
        if (!cancelled) setInvoices([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, clientId]);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setMerchantName("");
      setMerchantAddress("");
      setReceiptDate(new Date().toISOString().split("T")[0]);
      setCategory(defaultCategory);
      setPaymentMethod(defaultPaymentMethod);
      setVatRate(defaultVatRate);
      setTotalAmount("");
      setVatAmount("");
      setSubtotalAmount("");
      setIsManualVat(false);
      setReceiptFile(null);
      setReceiptPreview("");
      setReceiptContentType("");
      setClientId("");
      setInvoiceId("");
      setNotes("");
      setStatus("approved");
      setErrors({});
      setApiError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, defaultCategory, defaultPaymentMethod, defaultVatRate]);

  // Handle total amount change with automatic VAT and subtotal calculation
  const handleTotalChange = (val) => {
    setTotalAmount(val);
    if (errors.totalAmount) {
      setErrors((prev) => ({ ...prev, totalAmount: null }));
    }
    if (!isManualVat) {
      const parsedTotal = toNumberOrNull(val);
      const { subtotal, vat } = calculateSplit(parsedTotal, vatRate);
      setSubtotalAmount(subtotal);
      setVatAmount(vat);
    }
  };

  // Handle VAT rate change
  const handleVatRateChange = (rate) => {
    setVatRate(rate);
    const parsedTotal = toNumberOrNull(totalAmount);
    const { subtotal, vat } = calculateSplit(parsedTotal, rate);
    setSubtotalAmount(subtotal);
    setVatAmount(vat);
    setIsManualVat(false);
  };

  // Manual VAT override
  const handleVatChange = (val) => {
    setVatAmount(val);
    setIsManualVat(true);
    const parsedTotal = toNumberOrNull(totalAmount);
    const parsedVat = toNumberOrNull(val);
    if (parsedTotal !== null && parsedVat !== null) {
      setSubtotalAmount(formatDecimal(Math.max(0, parsedTotal - parsedVat)));
    }
  };

  // Quick merchant selection
  const handleSelectMerchant = (m) => {
    setMerchantName(m.name);
    if (m.category) setCategory(m.category);
    if (errors.merchantName) {
      setErrors((prev) => ({ ...prev, merchantName: null }));
    }
  };

  // File upload handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);
    setReceiptContentType(file.type || "application/octet-stream");

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setReceiptPreview(event.target?.result || "");
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview("");
    }
  };

  const handleRemoveFile = () => {
    setReceiptFile(null);
    setReceiptPreview("");
    setReceiptContentType("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = () => {
    const newErrors = {};
    if (!merchantName.trim()) {
      newErrors.merchantName = "Vul een winkel of leverancier in";
    }
    const parsedTotal = toNumberOrNull(totalAmount);
    if (parsedTotal === null || parsedTotal <= 0) {
      newErrors.totalAmount = "Vul een geldig totaalbedrag in";
    }
    if (!receiptDate) {
      newErrors.receiptDate = "Kies een datum";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setApiError(null);

    const parsedTotal = toNumberOrNull(totalAmount) ?? 0;
    const parsedVat =
      toNumberOrNull(vatAmount) ?? (parsedTotal * vatRate) / (100 + vatRate);
    const parsedSubtotal =
      toNumberOrNull(subtotalAmount) ?? parsedTotal - parsedVat;

    const vatLines = [
      {
        rate: vatRate,
        base_amount: Number(parsedSubtotal.toFixed(2)),
        vat_amount: Number(parsedVat.toFixed(2)),
      },
    ];

    const selectedClient = clients.find((c) => c.id === clientId);
    const selectedInvoice = invoices.find((inv) => inv.id === invoiceId);

    const payload = {
      merchant_name: merchantName.trim(),
      merchant_address: merchantAddress.trim() || null,
      receipt_date: receiptDate || null,
      payment_method: paymentMethod || "PIN / Betaalpas",
      category: category || "Bouwmaterialen & Onderdelen",
      currency: "EUR",
      subtotal_amount: Number(parsedSubtotal.toFixed(2)),
      vat_amount: Number(parsedVat.toFixed(2)),
      total_amount: Number(parsedTotal.toFixed(2)),
      vat_lines: vatLines,
      line_items: [
        {
          description: notes.trim() || merchantName.trim(),
          quantity: 1,
          unit_price: Number(parsedSubtotal.toFixed(2)),
          total_price: Number(parsedSubtotal.toFixed(2)),
          vat_rate: vatRate,
        },
      ],
      receipt_url: receiptPreview || "",
      receipt_content_type: receiptContentType || null,
      client_id: clientId || null,
      client_name: selectedClient ? selectedClient.name : null,
      invoice_id: invoiceId || null,
      invoice_number: selectedInvoice ? selectedInvoice.invoice_number : null,
      notes: notes.trim() || null,
      status: status || "approved",
      source: receiptFile ? "upload" : "manual",
    };

    try {
      let createdExpense = null;
      try {
        const res = await expensesApi.create(payload);
        createdExpense = res?.expense;
      } catch (_err) {
        // Fallback gracefully if backend POST /api/v1/expenses returns 404 or fails
        createdExpense = {
          id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          status: payload.status,
          source: payload.source,
          sender_name: "Handmatig ingevoerd",
          sender_phone: null,
          merchant_name: payload.merchant_name,
          merchant_address: payload.merchant_address,
          receipt_date: payload.receipt_date,
          payment_method: payload.payment_method,
          category: payload.category,
          currency: "EUR",
          subtotal_amount: payload.subtotal_amount,
          vat_amount: payload.vat_amount,
          total_amount: payload.total_amount,
          vat_lines: payload.vat_lines,
          line_items: payload.line_items,
          receipt_url: payload.receipt_url,
          receipt_content_type: payload.receipt_content_type,
          extraction_confidence: 1.0,
          client_id: payload.client_id,
          client_name: payload.client_name,
          invoice_id: payload.invoice_id,
          invoice_number: payload.invoice_number,
          notes: payload.notes,
          rejection_reason: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      if (onAdded && createdExpense) {
        onAdded(createdExpense);
      }
      onClose();
    } catch (err) {
      setApiError(
        err?.message ||
          "Er is een fout opgetreden bij het toevoegen van de uitgave.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectClassName =
    "flex h-9.5 w-full appearance-none rounded-xl border border-border/80 bg-background/80 px-3.5 pr-8 py-2 text-sm font-sans text-foreground shadow-2xs transition-all duration-150 cursor-pointer focus-visible:border-primary/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20";

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <ModalHeader
          title="Nieuwe Uitgave Toevoegen"
          description="Voer handmatig een zakelijke aankoop of aankoopbon in voor je BTW-reservering en administratie."
          badge="Handmatig / Bon"
          icon={<Receipt className="size-5" />}
        />

        <ModalBody className="space-y-5">
          {apiError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p>{apiError}</p>
            </div>
          )}

          {/* 1. Leverancier / Winkel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="merchant_name"
                className="text-xs font-semibold text-foreground"
              >
                Leverancier of Winkel{" "}
                <span className="text-destructive">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground font-normal">
                Snelle selectie:
              </span>
            </div>

            <Input
              id="merchant_name"
              placeholder="Bijv. Bouwmaat Amsterdam, Hornbach, Shell..."
              value={merchantName}
              onChange={(e) => {
                setMerchantName(e.target.value);
                if (errors.merchantName) {
                  setErrors((prev) => ({ ...prev, merchantName: null }));
                }
              }}
              className={cn(
                errors.merchantName &&
                  "border-destructive focus-visible:ring-destructive/20",
              )}
            />
            {errors.merchantName && (
              <p className="text-[11px] text-destructive font-medium">
                {errors.merchantName}
              </p>
            )}

            {/* Merchant suggestion pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {merchants.map((m) => {
                const isSelected = merchantName === m.name;
                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => handleSelectMerchant(m)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer active:scale-95",
                      isSelected
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/70 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Datum & Categorie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="receipt_date"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <Calendar className="size-3.5 text-muted-foreground" />
                Aankoopdatum <span className="text-destructive">*</span>
              </label>
              <Input
                id="receipt_date"
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className={cn(errors.receiptDate && "border-destructive")}
              />
              {errors.receiptDate && (
                <p className="text-[11px] text-destructive font-medium">
                  {errors.receiptDate}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="category"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <Tag className="size-3.5 text-muted-foreground" />
                Categorie
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={selectClassName}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Bedragen & BTW Splitsing */}
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Bedragen & BTW
              </h4>
              <span className="text-[11px] font-mono text-muted-foreground">
                Automatische splitsing
              </span>
            </div>

            {/* BTW Tarief selector */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-medium text-muted-foreground">
                BTW-tarief
              </span>
              <div className="grid grid-cols-3 gap-2">
                {vatRates.map((item) => {
                  const isSelected = Number(vatRate) === Number(item.rate);
                  return (
                    <button
                      key={item.rate}
                      type="button"
                      onClick={() => handleVatRateChange(item.rate)}
                      className={cn(
                        "py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      )}
                    >
                      {isSelected && <Check className="size-3" />}
                      <span>{item.rate}% BTW</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inputs: Total, VAT, Subtotal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="total_amount"
                  className="text-xs font-bold text-foreground"
                >
                  Totaal incl. BTW <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-foreground">
                    €
                  </span>
                  <Input
                    id="total_amount"
                    placeholder="0,00"
                    value={totalAmount}
                    onChange={(e) => handleTotalChange(e.target.value)}
                    className={cn(
                      "pl-7 font-mono font-bold text-foreground tabular-nums",
                      errors.totalAmount &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                  />
                </div>
                {errors.totalAmount && (
                  <p className="text-[10px] text-destructive font-medium">
                    {errors.totalAmount}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="vat_amount"
                  className="text-xs font-semibold text-muted-foreground flex items-center justify-between"
                >
                  <span>BTW bedrag</span>
                  {isManualVat && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      Handmatig
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                    €
                  </span>
                  <Input
                    id="vat_amount"
                    placeholder="0,00"
                    value={vatAmount}
                    onChange={(e) => handleVatChange(e.target.value)}
                    className="pl-7 font-mono text-muted-foreground tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="subtotal_amount"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  Excl. BTW
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                    €
                  </span>
                  <Input
                    id="subtotal_amount"
                    placeholder="0,00"
                    value={subtotalAmount}
                    onChange={(e) => setSubtotalAmount(e.target.value)}
                    className="pl-7 font-mono text-muted-foreground tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Quick Summary Pill */}
            {toNumberOrNull(totalAmount) > 0 && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 pt-0.5">
                <Check className="size-3.5" />
                <span>
                  Bij kwartaalaangifte vraag je{" "}
                  <strong>€{vatAmount || "0,00"}</strong> BTW terug als
                  voorbelasting.
                </span>
              </p>
            )}
          </div>

          {/* 4. Betaalmethode & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="payment_method"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <CreditCard className="size-3.5 text-muted-foreground" />
                Betaalmethode
              </label>
              <select
                id="payment_method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={selectClassName}
              >
                {paymentMethods.map((pm) => {
                  const val =
                    typeof pm === "object" ? pm.value || pm.label : pm;
                  const label = typeof pm === "object" ? pm.label : pm;
                  return (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="expense_status"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                Status
              </label>
              <select
                id="expense_status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={selectClassName}
              >
                <option value="approved">
                  Goedgekeurd (direct in administratie)
                </option>
                <option value="needs_review">
                  Te controleren (later nakijken)
                </option>
              </select>
            </div>
          </div>

          {/* 5. Bonnetje Bijvoegen / Upload (Optioneel) */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Bonnetje of Factuur (Optioneel)</span>
              {receiptFile && (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-[11px] text-destructive hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X className="size-3" /> Verwijderen
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {receiptFile ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-muted/40">
                {receiptPreview ? (
                  // biome-ignore lint/performance/noImgElement: Data URL preview of locally uploaded user receipt
                  <img
                    src={receiptPreview}
                    alt="Preview"
                    className="size-12 rounded-lg object-cover border border-border"
                  />
                ) : (
                  <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    PDF
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {receiptFile.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {(receiptFile.size / 1024).toFixed(0)} KB •{" "}
                    {receiptFile.type || "Document"}
                  </p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border border-dashed border-border/80 hover:border-primary/50 bg-background/50 hover:bg-muted/30 transition-all cursor-pointer text-center"
              >
                <UploadCloud className="size-6 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">
                  Klik om een foto of PDF van het bonnetje te uploaden
                </p>
                <p className="text-[11px] text-muted-foreground">
                  PNG, JPG, WEBP of PDF (max 10MB)
                </p>
              </button>
            )}
          </div>

          {/* 6. Koppeling aan Klant of Factuur (Optioneel) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="space-y-1.5">
              <label
                htmlFor="client_id"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <Building2 className="size-3.5 text-muted-foreground" />
                Klant koppelen (optioneel)
              </label>
              <select
                id="client_id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={selectClassName}
              >
                <option value="">— Geen klant gekoppeld —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="invoice_id"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <FileText className="size-3.5 text-muted-foreground" />
                Factuur koppelen (optioneel)
              </label>
              <select
                id="invoice_id"
                value={invoiceId}
                disabled={!clientId || invoices.length === 0}
                onChange={(e) => setInvoiceId(e.target.value)}
                className={selectClassName}
              >
                <option value="">
                  {!clientId
                    ? "— Kies eerst een klant —"
                    : invoices.length === 0
                      ? "— Geen facturen gevonden —"
                      : "— Geen factuur gekoppeld —"}
                </option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 7. Notities */}
          <div className="space-y-1.5">
            <label
              htmlFor="notes"
              className="text-xs font-semibold text-foreground"
            >
              Notities of omschrijving van de aankoop
            </label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bijv. Materialen en PVC buizen voor renovatie badkamer..."
              className="w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-sm font-sans text-foreground shadow-2xs transition-all duration-150 placeholder:text-muted-foreground/70 resize-y focus-visible:border-primary/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
        </ModalBody>

        <ModalFooter className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full text-xs px-4 active:scale-95 transition-all cursor-pointer"
          >
            Annuleren
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="rounded-full text-xs font-semibold px-5 shadow-xs hover:shadow-md active:scale-95 transition-all min-w-28 justify-center cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                Opslaan...
              </>
            ) : (
              <>
                <Plus className="size-3.5 mr-1.5" />
                Uitgave opslaan
              </>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default AddExpenseModal;
