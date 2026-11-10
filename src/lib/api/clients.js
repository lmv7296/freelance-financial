import { tokenStorage } from "./auth";
import { apiRequest } from "./client";

/**
 * @typedef {{
 *   id: string; type: "particulier" | "bedrijf"; name: string; created_at: string;
 *   email?: string; phone?: string; kvk_number?: string; vat_number?: string;
 *   contact_person?: string; address_line1?: string; address_line2?: string;
 *   site_note?: string;
 * }} Client
 *
 * @typedef {Partial<Omit<Client, "id" | "created_at">>} ClientInput
 */

const auth = () => tokenStorage.getToken() || undefined;

/** Clients API. Sorted by name; phone numbers come back in E.164 (+31…). */
export const clientsApi = {
  /** @returns {Promise<{ clients: Client[] }>} */
  list: async () =>
    apiRequest("/api/v1/clients", { method: "GET", token: auth() }),

  /**
   * @param {ClientInput} input
   * @returns {Promise<{ client: Client }>}
   */
  create: async (input) =>
    apiRequest("/api/v1/clients", {
      method: "POST",
      token: auth(),
      body: JSON.stringify(input),
    }),

  /**
   * Only the given fields change.
   * @param {string} id
   * @param {ClientInput} input
   * @returns {Promise<{ client: Client }>}
   */
  update: async (id, input) =>
    apiRequest(`/api/v1/clients/${encodeURIComponent(id)}`, {
      method: "PATCH",
      token: auth(),
      body: JSON.stringify(input),
    }),
};
