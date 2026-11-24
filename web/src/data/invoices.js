import { configApi, DEFAULT_CONFIG } from "@/lib/api/config";

/**
 * Invoice filters, default line items and constants.
 * The invoices themselves come from the backend (src/lib/api/invoices.js).
 */

export const STATUS_FILTERS = ["All", "Pending", "Paid", "Overdue", "Draft"];

export const DEFAULT_LINE_ITEMS = [
  {
    id: "item-1",
    description: "invoiceForm.defaultLines.labour",
    quantity: 2,
    unitPrice: "65.00",
  },
  {
    id: "item-2",
    description: "invoiceForm.defaultLines.materials",
    quantity: 1,
    unitPrice: "45.00",
  },
];

// Labels are translation keys (FormModal translates option labels)
export const TRADE_TYPES = [
  { label: "invoices.tradeTypes.Electrician", value: "Electrician" },
  { label: "invoices.tradeTypes.Plumber", value: "Plumber" },
  {
    label: "invoices.tradeTypes.Market Trader (Markt)",
    value: "Market Trader (Markt)",
  },
  { label: "invoices.tradeTypes.Contractor", value: "Contractor" },
  { label: "invoices.tradeTypes.Commercial", value: "Commercial" },
];

export const getPaymentMethods = () => {
  const cfg = configApi.getConfig();
  return cfg.payment_methods || DEFAULT_CONFIG.payment_methods;
};

export const getVatRates = () => {
  const cfg = configApi.getConfig();
  return cfg.vat_rates || DEFAULT_CONFIG.vat_rates;
};

export const PAYMENT_METHODS = configApi.getConfig().payment_methods;

export const VAT_RATES = configApi.getConfig().vat_rates;
