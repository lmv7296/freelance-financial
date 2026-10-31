import { tokenStorage } from "./auth";
import { apiRequest } from "./client";

/**
 * Builds a query string from an object, skipping empty values
 * @param {Record<string, string | number | undefined | null>} params
 */
function toQueryString(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/**
 * Expenses (bonnetjes) API
 * Receipts arrive via WhatsApp, the backend extracts the data and stores them as expenses.
 * See `Expense` in src/types/api.d.ts for the response shape.
 */
export const expensesApi = {
  /**
   * List expenses
   * @param {{ status?: string; search?: string }} [params]
   * @returns {Promise<{ expenses: import("@/types/api").Expense[] }>}
   */
  list: async (params = {}) => {
    return apiRequest(`/api/v1/expenses${toQueryString(params)}`, {
      method: "GET",
      token: tokenStorage.getToken() || undefined,
    });
  },

  /**
   * Get a single expense
   * @param {string} id
   * @returns {Promise<{ expense: import("@/types/api").Expense }>}
   */
  get: async (id) => {
    return apiRequest(`/api/v1/expenses/${encodeURIComponent(id)}`, {
      method: "GET",
      token: tokenStorage.getToken() || undefined,
    });
  },

  /**
   * Partially update an expense (correct extracted data, change status, link client/invoice)
   * @param {string} id
   * @param {import("@/types/api").UpdateExpenseRequest} payload
   * @returns {Promise<{ expense: import("@/types/api").Expense }>}
   */
  update: async (id, payload) => {
    return apiRequest(`/api/v1/expenses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      token: tokenStorage.getToken() || undefined,
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete an expense
   * @param {string} id
   * @returns {Promise<{ message: string }>}
   */
  remove: async (id) => {
    return apiRequest(`/api/v1/expenses/${encodeURIComponent(id)}`, {
      method: "DELETE",
      token: tokenStorage.getToken() || undefined,
    });
  },
};

/**
 * Options for linking an expense to a client or invoice
 */
export const expenseLinkApi = {
  /**
   * @returns {Promise<{ clients: { id: string; name: string }[] }>}
   */
  listClients: async () => {
    return apiRequest("/api/v1/clients", {
      method: "GET",
      token: tokenStorage.getToken() || undefined,
    });
  },

  /**
   * @param {string} [clientId]
   * @returns {Promise<{ invoices: { id: string; invoice_number: string; client_id: string }[] }>}
   */
  listInvoices: async (clientId) => {
    return apiRequest(
      `/api/v1/invoices${toQueryString({ client_id: clientId })}`,
      {
        method: "GET",
        token: tokenStorage.getToken() || undefined,
      },
    );
  },
};
