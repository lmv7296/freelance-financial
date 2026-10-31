import { tokenStorage } from "./auth";
import { apiRequest } from "./client";

/**
 * Tax Vault API
 * The backend calculates all estimates from tax rules stored in the database.
 * See docs/tax-vault-backend.md and src/types/taxVault.d.ts for the contract.
 */
export const taxVaultApi = {
  /**
   * Estimates, deadlines, warnings and the rules used for one tax year
   * @param {number} [year]
   * @returns {Promise<import("@/types/taxVault").TaxVaultOverview>}
   */
  getOverview: async (year) => {
    const query = year ? `?year=${encodeURIComponent(year)}` : "";
    return apiRequest(`/api/v1/tax-vault${query}`, {
      method: "GET",
      token: tokenStorage.getToken() || undefined,
    });
  },

  /**
   * @returns {Promise<{ profile: import("@/types/taxVault").TaxProfile }>}
   */
  getProfile: async () => {
    return apiRequest("/api/v1/tax-profile", {
      method: "GET",
      token: tokenStorage.getToken() || undefined,
    });
  },

  /**
   * @param {Partial<import("@/types/taxVault").TaxProfile>} payload
   * @returns {Promise<{ profile: import("@/types/taxVault").TaxProfile }>}
   */
  updateProfile: async (payload) => {
    return apiRequest("/api/v1/tax-profile", {
      method: "PUT",
      token: tokenStorage.getToken() || undefined,
      body: JSON.stringify(payload),
    });
  },

  /**
   * Export formats the backend can generate
   * @returns {Promise<{ formats: import("@/types/taxVault").ExportFormatOption[] }>}
   */
  getExportOptions: async () => {
    return apiRequest("/api/v1/tax-vault/export-options", {
      method: "GET",
      token: tokenStorage.getToken() || undefined,
    });
  },

  /**
   * @param {number} year
   * @returns {Promise<{ exports: import("@/types/taxVault").TaxExport[] }>}
   */
  listExports: async (year) => {
    return apiRequest(
      `/api/v1/tax-vault/exports?year=${encodeURIComponent(year)}`,
      {
        method: "GET",
        token: tokenStorage.getToken() || undefined,
      },
    );
  },

  /**
   * Start generating an export (and optionally email it to the accountant)
   * @param {import("@/types/taxVault").CreateTaxExportRequest} payload
   * @returns {Promise<{ export: import("@/types/taxVault").TaxExport }>}
   */
  createExport: async (payload) => {
    return apiRequest("/api/v1/tax-vault/exports", {
      method: "POST",
      token: tokenStorage.getToken() || undefined,
      body: JSON.stringify(payload),
    });
  },
};
