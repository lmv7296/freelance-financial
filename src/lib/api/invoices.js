import { tokenStorage } from "./auth";
import { apiRequest } from "./client";

/**
 * Invoices API (read-only for now)
 * Newest first (by issue date). Amounts are in cents; dates are YYYY-MM-DD.
 *
 * @typedef {{
 *   id: string; invoice_number: string; client_id: string; client_name?: string;
 *   issue_date?: string; due_date?: string; paid_at?: string; currency?: string;
 *   status: "DRAFT" | "SENT" | "PAID" | "CANCELLED";
 *   subtotal_cents?: number; vat_amount_cents?: number; total_cents?: number;
 * }} Invoice
 */
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
      token: tokenStorage.getToken() || undefined,
    });
  },
};
