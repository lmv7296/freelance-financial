import { tokenStorage } from "./auth";
import { ApiClientError, apiRequest, getApiBaseUrl } from "./client";

const authToken = () => tokenStorage.getToken() || undefined;

/**
 * Settings API
 * Company-wide settings live under /api/v1/settings, personal ones under /api/v1/me.
 * See docs/settings-backend.md and src/types/settings.d.ts for the contract.
 */
export const settingsApi = {
  // --- Personal: preferences (language, theme, notifications) ---

  /** @returns {Promise<{ preferences: import("@/types/settings").UserPreferences }>} */
  getPreferences: async () =>
    apiRequest("/api/v1/me/preferences", { method: "GET", token: authToken() }),

  /** @param {Partial<import("@/types/settings").UserPreferences>} payload */
  updatePreferences: async (payload) =>
    apiRequest("/api/v1/me/preferences", {
      method: "PATCH",
      token: authToken(),
      body: JSON.stringify(payload),
    }),

  // --- Personal: account & security ---

  /** @param {{ new_email: string; current_password: string }} payload */
  changeEmail: async (payload) =>
    apiRequest("/api/v1/me/email", {
      method: "PATCH",
      token: authToken(),
      body: JSON.stringify(payload),
    }),

  /** @param {{ current_password: string; new_password: string }} payload */
  changePassword: async (payload) =>
    apiRequest("/api/v1/auth/change-password", {
      method: "POST",
      token: authToken(),
      body: JSON.stringify(payload),
    }),

  /** Revokes every session of the current user, including this one */
  logoutAllSessions: async () =>
    apiRequest("/api/v1/auth/logout-all", {
      method: "POST",
      token: authToken(),
    }),

  // --- Company: details ---

  /** @returns {Promise<{ company: import("@/types/settings").CompanySettings }>} */
  getCompany: async () =>
    apiRequest("/api/v1/settings/company", {
      method: "GET",
      token: authToken(),
    }),

  /** @param {Partial<import("@/types/settings").CompanySettings>} payload */
  updateCompany: async (payload) =>
    apiRequest("/api/v1/settings/company", {
      method: "PATCH",
      token: authToken(),
      body: JSON.stringify(payload),
    }),

  /**
   * Upload the company logo (multipart, so not through apiRequest's JSON headers)
   * @param {File} file
   * @returns {Promise<{ company: import("@/types/settings").CompanySettings }>}
   */
  uploadLogo: async (file) => {
    const body = new FormData();
    body.append("logo", file);
    const token = authToken();
    let response;
    try {
      response = await fetch(
        `${getApiBaseUrl()}/api/v1/settings/company/logo`,
        {
          method: "POST",
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body,
        },
      );
    } catch (err) {
      throw new ApiClientError(
        err?.message || "Netwerkfout bij verbinden met de server",
        0,
      );
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiClientError(
        data?.error || data?.message || `Upload mislukt (${response.status})`,
        response.status,
        data,
      );
    }
    return data;
  },

  deleteLogo: async () =>
    apiRequest("/api/v1/settings/company/logo", {
      method: "DELETE",
      token: authToken(),
    }),

  // --- Company: invoice defaults ---

  /** @returns {Promise<{ invoice_defaults: import("@/types/settings").InvoiceDefaults }>} */
  getInvoiceDefaults: async () =>
    apiRequest("/api/v1/settings/invoice-defaults", {
      method: "GET",
      token: authToken(),
    }),

  /** @param {Partial<import("@/types/settings").InvoiceDefaults>} payload */
  updateInvoiceDefaults: async (payload) =>
    apiRequest("/api/v1/settings/invoice-defaults", {
      method: "PATCH",
      token: authToken(),
      body: JSON.stringify(payload),
    }),

  // --- Company: lists used in forms (quick-select shops, categories, payment methods) ---

  /** @returns {Promise<{ lists: import("@/types/settings").CompanyLists }>} */
  getLists: async () =>
    apiRequest("/api/v1/settings/lists", { method: "GET", token: authToken() }),

  /** @param {import("@/types/settings").CompanyLists} payload */
  updateLists: async (payload) =>
    apiRequest("/api/v1/settings/lists", {
      method: "PUT",
      token: authToken(),
      body: JSON.stringify(payload),
    }),

  // --- Company: WhatsApp receipt senders ---

  /** @returns {Promise<import("@/types/settings").WhatsAppSettings>} */
  getWhatsApp: async () =>
    apiRequest("/api/v1/settings/whatsapp", {
      method: "GET",
      token: authToken(),
    }),

  /** @param {{ name: string; phone: string }} payload */
  addWhatsAppSender: async (payload) =>
    apiRequest("/api/v1/settings/whatsapp/senders", {
      method: "POST",
      token: authToken(),
      body: JSON.stringify(payload),
    }),

  /**
   * @param {string} id
   * @param {Partial<{ name: string; active: boolean }>} payload
   */
  updateWhatsAppSender: async (id, payload) =>
    apiRequest(`/api/v1/settings/whatsapp/senders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      token: authToken(),
      body: JSON.stringify(payload),
    }),

  /** @param {string} id */
  removeWhatsAppSender: async (id) =>
    apiRequest(`/api/v1/settings/whatsapp/senders/${encodeURIComponent(id)}`, {
      method: "DELETE",
      token: authToken(),
    }),
};
