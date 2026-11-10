import { tokenStorage } from "./auth";
import { apiRequest } from "./client";

/**
 * Invoices API (read-only for now)
 * The backend only guarantees `{ id, invoice_number, client_id }` per invoice
 * (it was built to link expenses to invoices). Don't read amounts, dates or
 * statuses from it until the backend documents them.
 */
export const invoicesApi = {
  /**
   * @param {{ client_id?: string }} [params]
   * @returns {Promise<{ invoices: { id: string; invoice_number: string; client_id: string }[] }>}
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
