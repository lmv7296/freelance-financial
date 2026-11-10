import { tokenStorage } from "./auth";
import { apiRequest } from "./client";

/**
 * Newest first (by issue date). Amounts are in cents; dates are YYYY-MM-DD.
 *
 * @typedef {{ description: string; quantity: number; unit_price_cents: number; total_cents?: number }} InvoiceLineItem
 *
 * @typedef {{
 *   id: string; invoice_number: string; client_id: string; client_name?: string;
 *   issue_date?: string; due_date?: string; paid_at?: string; currency?: string;
 *   status: "DRAFT" | "SENT" | "PAID" | "CANCELLED";
 *   description?: string; trade_type?: string; payment_method?: string;
 *   line_items: InvoiceLineItem[]; vat_rate?: number;
 *   subtotal_cents?: number; vat_amount_cents?: number; total_cents?: number;
 * }} Invoice
 *
 * @typedef {{
 *   client_id: string; line_items: InvoiceLineItem[];
 *   invoice_number?: string; issue_date?: string; due_date?: string;
 *   status?: "DRAFT" | "SENT" | "PAID"; vat_rate?: number;
 *   description?: string; trade_type?: string; payment_method?: string;
 * }} CreateInvoiceInput
 */

const auth = () => tokenStorage.getToken() || undefined;

export const invoicesApi = {
  /**
   * @param {{ client_id?: string }} [params]
   * @returns {Promise<{ invoices: Invoice[] }>}
   */
  list: async (params = {}) => {
    const query = params.client_id
      ? `?client_id=${encodeURIComponent(params.client_id)}`
      : "";
    return apiRequest(`/api/v1/invoices${query}`, {
      method: "GET",
      token: auth(),
    });
  },

  /**
   * The backend calculates the totals from the lines, and picks the next
   * invoice number (Settings → Invoices) when none is given.
   * @param {CreateInvoiceInput} input
   * @returns {Promise<{ invoice: Invoice }>}
   */
  create: async (input) =>
    apiRequest("/api/v1/invoices", {
      method: "POST",
      token: auth(),
      body: JSON.stringify(input),
    }),

  /**
   * Change status, due date or payment date.
   * @param {string} id
   * @param {{ status?: Invoice["status"]; due_date?: string; paid_at?: string }} input
   * @returns {Promise<{ invoice: Invoice }>}
   */
  update: async (id, input) =>
    apiRequest(`/api/v1/invoices/${encodeURIComponent(id)}`, {
      method: "PATCH",
      token: auth(),
      body: JSON.stringify(input),
    }),
};
