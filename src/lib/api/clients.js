import { tokenStorage } from "./auth";
import { apiRequest } from "./client";

/**
 * Clients API (read-only for now)
 * The backend only guarantees `{ id, name }` per client.
 */
export const clientsApi = {
  /** @returns {Promise<{ clients: { id: string; name: string }[] }>} */
  list: async () =>
    apiRequest("/api/v1/clients", {
      method: "GET",
      token: tokenStorage.getToken() || undefined,
    }),
};
