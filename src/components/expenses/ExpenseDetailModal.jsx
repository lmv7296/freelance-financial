"use client";

import {
  AlertTriangle,
  Check,
  Loader2,
  MessageCircle,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { ExpenseStatusChip } from "@/components/expenses/ExpenseStatusChip";
import { ReceiptViewer } from "@/components/expenses/ReceiptViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { expenseLinkApi, expensesApi } from "@/lib/api/expenses";
import { formatDate } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/formatCurrency";
import { useT } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

// Below this extraction confidence we ask the user to double-check the data
const LOW_CONFIDENCE_THRESHOLD = 0.8;

const selectClassName =
  "flex h-9.5 w-full rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-sm font-sans text-foreground shadow-2xs transition-all duration-150 focus-visible:border-primary/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50";

/** Number from the API -> editable string with Dutch decimal comma */
function toInputValue(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value).replace(".", ",");
}

/** Editable string ("1.250,50", "42.10", "") -> number or null */
function toNumberOrNull(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number.parseFloat(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function toDraft(expense) {
  return {
    merchant_name: expense.merchant_name ?? "",
    merchant_address: expense.merchant_address ?? "",
    receipt_date: expense.receipt_date ?? "",
    payment_method: expense.payment_method ?? "",
    category: expense.category ?? "",
    subtotal_amount: toInputValue(expense.subtotal_amount),
    vat_amount: toInputValue(expense.vat_amount),
    total_amount: toInputValue(expense.total_amount),
    vat_lines: (expense.vat_lines ?? []).map((line) => ({
      rate: toInputValue(line.rate),
      base_amount: toInputValue(line.base_amount),
      vat_amount: toInputValue(line.vat_amount),
    })),
    line_items: (expense.line_items ?? []).map((item) => ({
      description: item.description ?? "",
      quantity: toInputValue(item.quantity),
      unit_price: toInputValue(item.unit_price),
      total_price: toInputValue(item.total_price),
      vat_rate: toInputValue(item.vat_rate),
    })),
    client_id: expense.client_id ?? "",
    invoice_id: expense.invoice_id ?? "",
    notes: expense.notes ?? "",
  };
}

function fromDraft(draft) {
  const textOrNull = (v) => (v?.trim() ? v.trim() : null);
  return {
    merchant_name: textOrNull(draft.merchant_name),
    merchant_address: textOrNull(draft.merchant_address),
    receipt_date: draft.receipt_date || null,
    payment_method: textOrNull(draft.payment_method),
    category: textOrNull(draft.category),
    subtotal_amount: toNumberOrNull(draft.subtotal_amount),
    vat_amount: toNumberOrNull(draft.vat_amount),
    total_amount: toNumberOrNull(draft.total_amount),
    vat_lines: draft.vat_lines.map((line) => ({
      rate: toNumberOrNull(line.rate) ?? 0,
      base_amount: toNumberOrNull(line.base_amount) ?? 0,
      vat_amount: toNumberOrNull(line.vat_amount) ?? 0,
    })),
    line_items: draft.line_items
      .filter((item) => item.description.trim() || item.total_price)
      .map((item) => ({
        description: item.description.trim(),
        quantity: toNumberOrNull(item.quantity) ?? 1,
        unit_price: toNumberOrNull(item.unit_price) ?? 0,
        total_price: toNumberOrNull(item.total_price) ?? 0,
        vat_rate: toNumberOrNull(item.vat_rate),
      })),
    client_id: draft.client_id || null,
    invoice_id: draft.invoice_id || null,
    notes: textOrNull(draft.notes),
  };
}

function Field({ label, children, className }) {
  const id = useId();
  return (
    <div className={cn("space-y-1", className)}>
      <label
        htmlFor={id}
        className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      {children(id)}
    </div>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">
        {children}
      </h4>
      {action}
    </div>
  );
}

/**
 * Detail view of one expense: receipt on the left, extracted (editable) data on the right.
 * Remount with a new `key` when the expense changes so the draft resets.
 */
export function ExpenseDetailModal({
  expense,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
  categoryOptions = [],
}) {
  const t = useT();
  const [draft, setDraft] = useState(() => toDraft(expense));
  const [pendingAction, setPendingAction] = useState(null);
  const [error, setError] = useState(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [linkError, setLinkError] = useState(null);

  const currency = expense.currency || "EUR";
  const isProcessing = expense.status === "processing";
  const isBusy = pendingAction !== null;
  const isDirty = JSON.stringify(draft) !== JSON.stringify(toDraft(expense));

  // Load clients for the link selector
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    expenseLinkApi
      .listClients()
      .then((res) => {
        if (!cancelled) setClients(res?.clients ?? []);
      })
      .catch(() => {
        if (!cancelled) setLinkError("expenses.detail.clientsFailed");
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Load invoices of the selected client
  useEffect(() => {
    if (!isOpen || !draft.client_id) {
      setInvoices([]);
      return;
    }
    let cancelled = false;
    expenseLinkApi
      .listInvoices(draft.client_id)
      .then((res) => {
        if (!cancelled) setInvoices(res?.invoices ?? []);
      })
      .catch(() => {
        if (!cancelled) setInvoices([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, draft.client_id]);

  const setField = (field, value) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const setRow = (listKey, index, field, value) =>
    setDraft((prev) => ({
      ...prev,
      [listKey]: prev[listKey].map((row, i) =>
        i === index ? { ...row, [field]: value } : row,
      ),
    }));

  const addRow = (listKey, emptyRow) =>
    setDraft((prev) => ({ ...prev, [listKey]: [...prev[listKey], emptyRow] }));

  const removeRow = (listKey, index) =>
    setDraft((prev) => ({
      ...prev,
      [listKey]: prev[listKey].filter((_, i) => i !== index),
    }));

  const runUpdate = async (action, extraPayload = {}) => {
    setPendingAction(action);
    setError(null);
    try {
      const payload = { ...(isDirty ? fromDraft(draft) : {}), ...extraPayload };
      const res = await expensesApi.update(expense.id, payload);
      onUpdated?.(res?.expense ?? { ...expense, ...payload });
    } catch (err) {
      setError(err?.message || t("expenses.detail.saveFailed"));
    } finally {
      setPendingAction(null);
    }
  };

  const handleDelete = async () => {
    setPendingAction("delete");
    setError(null);
    try {
      await expensesApi.remove(expense.id);
      onDeleted?.(expense.id);
    } catch (err) {
      setError(err?.message || t("expenses.detail.deleteFailed"));
      setPendingAction(null);
    }
  };

  // Sanity check: do the line items add up to the receipt total?
  const lineItemsSum = draft.line_items.reduce(
    (sum, item) => sum + (toNumberOrNull(item.total_price) ?? 0),
    0,
  );
  const total = toNumberOrNull(draft.total_amount);
  const hasLineItemMismatch =
    draft.line_items.length > 0 &&
    total !== null &&
    Math.abs(lineItemsSum - total) > 0.01;

  const isLowConfidence =
    typeof expense.extraction_confidence === "number" &&
    expense.extraction_confidence < LOW_CONFIDENCE_THRESHOLD;

  const senderLabel =
    [expense.sender_name, expense.sender_phone].filter(Boolean).join(" • ") ||
    t("expenses.detail.unknownSender");

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="full">
      <ModalHeader
        title={expense.merchant_name || t("expenses.detail.unknownShop")}
        description={t("expenses.detail.subtitle", {
          sender: senderLabel,
          date: formatDate(expense.created_at),
        })}
        icon={<Receipt className="size-5" />}
        badge={<ExpenseStatusChip status={expense.status} />}
      />

      <ModalBody className="space-y-0">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* Left: original receipt */}
          <ReceiptViewer
            url={expense.receipt_url}
            contentType={expense.receipt_content_type}
            alt={t("expenses.detail.receiptAlt", {
              shop: expense.merchant_name || "",
            })}
            className="lg:sticky lg:top-0 lg:max-h-[70vh] min-h-[320px]"
          />

          {/* Right: extracted data */}
          <fieldset
            disabled={isProcessing || isBusy}
            className="space-y-3 min-w-0"
          >
            {isProcessing && (
              <Banner tone="info" icon={Loader2} spin>
                {t("expenses.detail.processing")}
              </Banner>
            )}
            {isLowConfidence && !isProcessing && (
              <Banner tone="warning" icon={AlertTriangle}>
                {t("expenses.detail.lowConfidence", {
                  percent: Math.round(expense.extraction_confidence * 100),
                })}
              </Banner>
            )}
            {expense.status === "rejected" && expense.rejection_reason && (
              <Banner tone="destructive" icon={X}>
                {t("expenses.detail.rejectedReason", {
                  reason: expense.rejection_reason,
                })}
              </Banner>
            )}

            <SectionTitle>{t("expenses.detail.sectionDetails")}</SectionTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("expenses.detail.shop")}>
                {(id) => (
                  <Input
                    id={id}
                    value={draft.merchant_name}
                    onChange={(e) => setField("merchant_name", e.target.value)}
                  />
                )}
              </Field>
              <Field label={t("expenses.detail.receiptDate")}>
                {(id) => (
                  <Input
                    id={id}
                    type="date"
                    value={draft.receipt_date}
                    onChange={(e) => setField("receipt_date", e.target.value)}
                  />
                )}
              </Field>
              <Field
                label={t("expenses.detail.shopAddress")}
                className="sm:col-span-2"
              >
                {(id) => (
                  <Input
                    id={id}
                    value={draft.merchant_address}
                    onChange={(e) =>
                      setField("merchant_address", e.target.value)
                    }
                  />
                )}
              </Field>
              <Field label={t("expenses.detail.paymentMethod")}>
                {(id) => (
                  <Input
                    id={id}
                    value={draft.payment_method}
                    onChange={(e) => setField("payment_method", e.target.value)}
                  />
                )}
              </Field>
              <Field label={t("expenses.detail.category")}>
                {(id) => (
                  <>
                    <Input
                      id={id}
                      list={`${id}-options`}
                      value={draft.category}
                      onChange={(e) => setField("category", e.target.value)}
                    />
                    <datalist id={`${id}-options`}>
                      {categoryOptions.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>
            </div>

            <SectionTitle>{t("expenses.detail.sectionAmounts")}</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <Field label={t("expenses.detail.exclVat")}>
                {(id) => (
                  <MoneyInput
                    id={id}
                    value={draft.subtotal_amount}
                    onChange={(v) => setField("subtotal_amount", v)}
                  />
                )}
              </Field>
              <Field label={t("expenses.detail.vat")}>
                {(id) => (
                  <MoneyInput
                    id={id}
                    value={draft.vat_amount}
                    onChange={(v) => setField("vat_amount", v)}
                  />
                )}
              </Field>
              <Field label={t("expenses.detail.total")}>
                {(id) => (
                  <MoneyInput
                    id={id}
                    value={draft.total_amount}
                    onChange={(v) => setField("total_amount", v)}
                    className="font-bold"
                  />
                )}
              </Field>
            </div>

            <SectionTitle
              action={
                <AddRowButton
                  label={t("expenses.detail.addVatRate")}
                  onClick={() =>
                    addRow("vat_lines", {
                      rate: "",
                      base_amount: "",
                      vat_amount: "",
                    })
                  }
                />
              }
            >
              {t("expenses.detail.sectionVat")}
            </SectionTitle>
            {draft.vat_lines.length > 0 ? (
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-left">
                        {t("expenses.detail.vatRatePercent")}
                      </th>
                      <th className="px-2 py-2 text-left">
                        {t("expenses.detail.vatBase")}
                      </th>
                      <th className="px-2 py-2 text-left">
                        {t("expenses.detail.vat")}
                      </th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {draft.vat_lines.map((line, index) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable id
                      <tr key={index}>
                        <td className="p-1.5">
                          <CellInput
                            aria-label={t("expenses.detail.vatRate")}
                            value={line.rate}
                            onChange={(v) =>
                              setRow("vat_lines", index, "rate", v)
                            }
                          />
                        </td>
                        <td className="p-1.5">
                          <CellInput
                            aria-label={t("expenses.detail.vatBase")}
                            value={line.base_amount}
                            onChange={(v) =>
                              setRow("vat_lines", index, "base_amount", v)
                            }
                          />
                        </td>
                        <td className="p-1.5">
                          <CellInput
                            aria-label={t("expenses.detail.vatAmount")}
                            value={line.vat_amount}
                            onChange={(v) =>
                              setRow("vat_lines", index, "vat_amount", v)
                            }
                          />
                        </td>
                        <td className="p-1.5">
                          <RemoveRowButton
                            onClick={() => removeRow("vat_lines", index)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyHint>{t("expenses.detail.noVatLines")}</EmptyHint>
            )}

            <SectionTitle
              action={
                <AddRowButton
                  label={t("expenses.detail.addLine")}
                  onClick={() =>
                    addRow("line_items", {
                      description: "",
                      quantity: "1",
                      unit_price: "",
                      total_price: "",
                      vat_rate: "",
                    })
                  }
                />
              }
            >
              {t("expenses.detail.sectionItems")}
            </SectionTitle>
            {draft.line_items.length > 0 ? (
              <div className="rounded-xl border border-border/60 overflow-x-auto">
                <table className="w-full min-w-[460px] text-xs">
                  <thead className="bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-left">
                        {t("expenses.detail.description")}
                      </th>
                      <th className="px-2 py-2 text-left w-14">
                        {t("expenses.detail.quantity")}
                      </th>
                      <th className="px-2 py-2 text-left w-20">
                        {t("expenses.detail.price")}
                      </th>
                      <th className="px-2 py-2 text-left w-20">
                        {t("expenses.detail.total")}
                      </th>
                      <th className="px-2 py-2 text-left w-14">
                        {t("expenses.detail.vatPercent")}
                      </th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {draft.line_items.map((item, index) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable id
                      <tr key={index}>
                        <td className="p-1.5">
                          <CellInput
                            aria-label={t("expenses.detail.description")}
                            value={item.description}
                            onChange={(v) =>
                              setRow("line_items", index, "description", v)
                            }
                            inputMode="text"
                          />
                        </td>
                        <td className="p-1.5">
                          <CellInput
                            aria-label={t("expenses.detail.quantity")}
                            value={item.quantity}
                            onChange={(v) =>
                              setRow("line_items", index, "quantity", v)
                            }
                          />
                        </td>
                        <td className="p-1.5">
                          <CellInput
                            aria-label={t("expenses.detail.unitPrice")}
                            value={item.unit_price}
                            onChange={(v) =>
                              setRow("line_items", index, "unit_price", v)
                            }
                          />
                        </td>
                        <td className="p-1.5">
                          <CellInput
                            aria-label={t("expenses.detail.lineTotal")}
                            value={item.total_price}
                            onChange={(v) =>
                              setRow("line_items", index, "total_price", v)
                            }
                          />
                        </td>
                        <td className="p-1.5">
                          <CellInput
                            aria-label={t("expenses.detail.vatRate")}
                            value={item.vat_rate}
                            onChange={(v) =>
                              setRow("line_items", index, "vat_rate", v)
                            }
                          />
                        </td>
                        <td className="p-1.5">
                          <RemoveRowButton
                            onClick={() => removeRow("line_items", index)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyHint>{t("expenses.detail.noItems")}</EmptyHint>
            )}
            {hasLineItemMismatch && (
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                <AlertTriangle className="size-3.5" />
                {t("expenses.detail.itemsMismatch", {
                  sum: formatCurrency(lineItemsSum, currency),
                  total: formatCurrency(total, currency),
                })}
              </p>
            )}

            <SectionTitle>{t("expenses.detail.sectionLink")}</SectionTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("expenses.detail.client")}>
                {(id) => (
                  <select
                    id={id}
                    value={draft.client_id}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        client_id: e.target.value,
                        invoice_id: "",
                      }))
                    }
                    className={selectClassName}
                  >
                    <option value="">{t("expenses.detail.noClient")}</option>
                    {/* Keep the current link visible even if the client list failed to load */}
                    {draft.client_id &&
                      !clients.some((c) => c.id === draft.client_id) && (
                        <option value={draft.client_id}>
                          {expense.client_name || draft.client_id}
                        </option>
                      )}
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label={t("expenses.detail.invoice")}>
                {(id) => (
                  <select
                    id={id}
                    value={draft.invoice_id}
                    onChange={(e) => setField("invoice_id", e.target.value)}
                    disabled={!draft.client_id}
                    className={selectClassName}
                  >
                    <option value="">{t("expenses.detail.noInvoice")}</option>
                    {draft.invoice_id &&
                      !invoices.some((i) => i.id === draft.invoice_id) && (
                        <option value={draft.invoice_id}>
                          {expense.invoice_number || draft.invoice_id}
                        </option>
                      )}
                    {invoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number || invoice.id}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
            {linkError && (
              <p className="text-[11px] text-muted-foreground">
                {t(linkError)}
              </p>
            )}

            <Field label={t("expenses.detail.note")}>
              {(id) => (
                <textarea
                  id={id}
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  className="flex w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-sm text-foreground shadow-2xs placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20 resize-y"
                  placeholder={t("expenses.detail.notePlaceholder")}
                />
              )}
            </Field>

            <p className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
              <MessageCircle className="size-3.5" />
              {t("expenses.detail.receivedVia", {
                source:
                  expense.source === "whatsapp" ? "WhatsApp" : expense.source,
                sender: senderLabel,
              })}
            </p>
          </fieldset>
        </div>
      </ModalBody>

      <ModalFooter className="flex-wrap justify-between">
        {/* Left side: delete with inline confirmation */}
        <div className="flex items-center gap-2">
          {isConfirmingDelete ? (
            <>
              <span className="text-xs font-medium text-destructive">
                {t("expenses.detail.confirmDelete")}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isBusy}
              >
                {pendingAction === "delete" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
                {t("expenses.detail.confirmDeleteYes")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isBusy}
              >
                {t("expenses.detail.cancel")}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsConfirmingDelete(true)}
              disabled={isBusy}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 />
              {t("expenses.detail.delete")}
            </Button>
          )}
        </div>

        {/* Right side: status actions */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {error && (
            <span className="text-xs font-medium text-destructive">
              {error}
            </span>
          )}

          {isRejecting ? (
            <>
              <Input
                autoFocus
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("expenses.detail.rejectReasonPlaceholder")}
                className="h-8 w-56 text-xs"
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={isBusy}
                onClick={() =>
                  runUpdate("reject", {
                    status: "rejected",
                    rejection_reason: rejectionReason.trim() || null,
                  })
                }
              >
                {pendingAction === "reject" && (
                  <Loader2 className="animate-spin" />
                )}
                {t("expenses.detail.reject")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={isBusy}
                onClick={() => setIsRejecting(false)}
              >
                {t("expenses.detail.cancel")}
              </Button>
            </>
          ) : (
            <>
              {isDirty && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => runUpdate("save")}
                >
                  {pendingAction === "save" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Save />
                  )}
                  {t("expenses.detail.saveChanges")}
                </Button>
              )}

              {expense.status === "needs_review" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => setIsRejecting(true)}
                  >
                    <X />
                    {t("expenses.detail.reject")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={isBusy}
                    onClick={() =>
                      runUpdate("approve", {
                        status: "approved",
                        rejection_reason: null,
                      })
                    }
                  >
                    {pendingAction === "approve" ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Check />
                    )}
                    {isDirty
                      ? t("expenses.detail.saveAndApprove")
                      : t("expenses.detail.approve")}
                  </Button>
                </>
              )}

              {(expense.status === "approved" ||
                expense.status === "rejected") && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() =>
                    runUpdate("reopen", {
                      status: "needs_review",
                      rejection_reason: null,
                    })
                  }
                >
                  {pendingAction === "reopen" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <RotateCcw />
                  )}
                  {t("expenses.detail.reopen")}
                </Button>
              )}
            </>
          )}
        </div>
      </ModalFooter>
    </Modal>
  );
}

function Banner({ tone, icon: Icon, spin = false, children }) {
  const tones = {
    info: "bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-200",
    warning:
      "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-200",
    destructive:
      "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-200",
  };
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed",
        tones[tone],
      )}
    >
      <Icon className={cn("size-4 shrink-0 mt-0.5", spin && "animate-spin")} />
      <p>{children}</p>
    </div>
  );
}

function MoneyInput({ id, value, onChange, className }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        €
      </span>
      <Input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("pl-7 font-mono tabular-nums", className)}
        placeholder="0,00"
      />
    </div>
  );
}

function CellInput({ value, onChange, inputMode = "decimal", ...props }) {
  return (
    <input
      {...props}
      inputMode={inputMode}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-xs text-foreground transition-colors",
        "hover:border-border/70 focus-visible:border-primary/50 focus-visible:bg-background focus-visible:outline-hidden",
        inputMode === "decimal" && "font-mono tabular-nums",
      )}
    />
  );
}

function AddRowButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 active:scale-95 transition-all cursor-pointer"
    >
      <Plus className="size-3" />
      {label}
    </button>
  );
}

function RemoveRowButton({ onClick }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-90 transition-all cursor-pointer"
      title={t("expenses.detail.removeLine")}
    >
      <X className="size-3.5" />
    </button>
  );
}

function EmptyHint({ children }) {
  return (
    <p className="rounded-xl border border-dashed border-border/70 px-3 py-2.5 text-[11px] text-muted-foreground">
      {children}
    </p>
  );
}

export default ExpenseDetailModal;
