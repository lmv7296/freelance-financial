import { tokenStorage } from "./auth";
import { apiRequest } from "./client";

/**
 * Go encodes an empty slice as `null` unless it's initialised, so every list in a
 * response may arrive as null. Turn those into [] here, once, so components can
 * call .length and .map without checking.
 */
const list = (value) => (Array.isArray(value) ? value : []);

/** @param {import("@/types/taxVault").TaxScenario | null} scenario */
function normalizeScenario(scenario) {
  if (!scenario) return null;
  return {
    ...scenario,
    components: list(scenario.components),
    steps: list(scenario.steps),
  };
}

/** @param {import("@/types/taxVault").TaxVaultOverview} overview */
function normalizeOverview(overview) {
  if (!overview) return overview;
  const { vat, income_tax: incomeTax, set_aside: setAside } = overview;
  return {
    ...overview,
    available_years: list(overview.available_years),
    vat: {
      ...vat,
      enabled: vat?.enabled ?? false,
      periods: list(vat?.periods).map((period) => ({
        ...period,
        rubrieken: list(period.rubrieken),
      })),
    },
    income_tax: incomeTax && {
      ...incomeTax,
      to_date: normalizeScenario(incomeTax.to_date),
      projected: normalizeScenario(incomeTax.projected),
    },
    set_aside: setAside && {
      ...setAside,
      components: list(setAside.components),
    },
    deadlines: list(overview.deadlines),
    warnings: list(overview.warnings),
    rules_used: list(overview.rules_used),
  };
}

/** @param {import("@/types/taxVault").TaxExport} item */
const normalizeExport = (item) =>
  item && { ...item, formats: list(item.formats) };

/** @param {import("@/types/taxVault").TaxProfile} profile */
const normalizeProfile = (profile) =>
  profile && {
    ...profile,
    default_export_formats: list(profile.default_export_formats),
  };

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
    const data = await apiRequest(`/api/v1/tax-vault${query}`, {
      method: "GET",
      token: tokenStorage.getToken() || undefined,
    });
    return normalizeOverview(data);
  },

  /**
   * @returns {Promise<{ profile: import("@/types/taxVault").TaxProfile }>}
   */
  getProfile: async () => {
    const data = await apiRequest("/api/v1/tax-profile", {
      method: "GET",
      token: tokenStorage.getToken() || undefined,
    });
    return { ...data, profile: normalizeProfile(data?.profile) };
  },

  /**
   * @param {Partial<import("@/types/taxVault").TaxProfile>} payload
   * @returns {Promise<{ profile: import("@/types/taxVault").TaxProfile }>}
   */
  updateProfile: async (payload) => {
    const data = await apiRequest("/api/v1/tax-profile", {
      method: "PUT",
      token: tokenStorage.getToken() || undefined,
      body: JSON.stringify(payload),
    });
    return { ...data, profile: normalizeProfile(data?.profile) };
  },

  /**
   * Export formats the backend can generate
   * @returns {Promise<{ formats: import("@/types/taxVault").ExportFormatOption[] }>}
   */
  getExportOptions: async () => {
    const data = await apiRequest("/api/v1/tax-vault/export-options", {
      method: "GET",
      token: tokenStorage.getToken() || undefined,
    });
    return { ...data, formats: list(data?.formats) };
  },

  /**
   * @param {number} year
   * @returns {Promise<{ exports: import("@/types/taxVault").TaxExport[] }>}
   */
  listExports: async (year) => {
    const data = await apiRequest(
      `/api/v1/tax-vault/exports?year=${encodeURIComponent(year)}`,
      {
        method: "GET",
        token: tokenStorage.getToken() || undefined,
      },
    );
    return { ...data, exports: list(data?.exports).map(normalizeExport) };
  },

  /**
   * Start generating an export (and optionally email it to the accountant)
   * @param {import("@/types/taxVault").CreateTaxExportRequest} payload
   * @returns {Promise<{ export: import("@/types/taxVault").TaxExport }>}
   */
  createExport: async (payload) => {
    const data = await apiRequest("/api/v1/tax-vault/exports", {
      method: "POST",
      token: tokenStorage.getToken() || undefined,
      body: JSON.stringify(payload),
    });
    return { ...data, export: normalizeExport(data?.export) };
  },
};
