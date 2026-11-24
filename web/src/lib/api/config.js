import { useEffect, useState } from "react";
import { tokenStorage } from "./auth";
import { apiRequest } from "./client";

export const CONFIG_CACHE_KEY = "ff_cached_config";

/**
 * Default fallback configuration used when the database endpoint
 * is not yet available or before initial fetch.
 */
export const DEFAULT_CONFIG = {
  payment_methods: [
    "PIN / Betaalpas",
    "Creditcard",
    "iDEAL",
    "Contant",
    "Overboeking",
  ],
  vat_rates: [
    { rate: 21, label: "21% Hoog (standaard)", value: "21" },
    { rate: 9, label: "9% Laag (verlaagd)", value: "9" },
    { rate: 0, label: "0% Nul / Vrijgesteld", value: "0" },
  ],
  categories: [
    "Bouwmaterialen & Onderdelen",
    "Gereedschap & Apparatuur",
    "Brandstof & Vervoer",
    "Kantoor & Administratie",
    "Werkkleding & PBM",
    "Onderhoud & Keuringen",
    "Software & Abonnementen",
    "Overig",
  ],
  common_merchants: [
    { name: "Bouwmaat", category: "Bouwmaterialen & Onderdelen" },
    { name: "Hornbach", category: "Bouwmaterialen & Onderdelen" },
    { name: "Toolstation", category: "Gereedschap & Apparatuur" },
    { name: "Warmteservice", category: "Bouwmaterialen & Onderdelen" },
    { name: "Gamma", category: "Bouwmaterialen & Onderdelen" },
    { name: "Praxis", category: "Bouwmaterialen & Onderdelen" },
    { name: "Shell", category: "Brandstof & Vervoer" },
    { name: "TotalEnergies", category: "Brandstof & Vervoer" },
  ],
};

/**
 * Storage helper for persisting database reference values in the browser
 */
export const configStorage = {
  get: () => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const raw = localStorage.getItem(CONFIG_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  set: (config) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
    } catch {
      // Storage unavailable
    }
  },
  clear: () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(CONFIG_CACHE_KEY);
    } catch {
      // Storage unavailable
    }
  },
};

/**
 * Configuration API to fetch payment methods, VAT rates, and categories from DB
 */
export const configApi = {
  /**
   * Fetches reference config from the database API (/api/v1/config).
   * Caches the result in localStorage.
   */
  fetchConfig: async () => {
    try {
      const data = await apiRequest("/api/v1/config", {
        method: "GET",
        token: tokenStorage.getToken() || undefined,
      });

      if (data) {
        const merged = {
          payment_methods:
            data.payment_methods || DEFAULT_CONFIG.payment_methods,
          vat_rates: data.vat_rates || DEFAULT_CONFIG.vat_rates,
          categories: data.categories || DEFAULT_CONFIG.categories,
          common_merchants:
            data.common_merchants || DEFAULT_CONFIG.common_merchants,
          cached_at: new Date().toISOString(),
        };
        configStorage.set(merged);
        return merged;
      }
    } catch (_err) {
      // Fallback if backend /api/v1/config endpoint is not yet implemented
    }

    const existing = configStorage.get();
    if (!existing) {
      configStorage.set(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
    return existing;
  },

  /**
   * Retrieves cached config immediately.
   * If not cached yet, seeds default and schedules background fetch.
   */
  getConfig: () => {
    const cached = configStorage.get();
    if (cached) return cached;

    if (typeof window !== "undefined") {
      configStorage.set(DEFAULT_CONFIG);
      configApi.fetchConfig().catch(() => {});
    }
    return DEFAULT_CONFIG;
  },

  /**
   * Fetches once on login to synchronize VAT rates and payment methods from DB.
   */
  refreshOnLogin: async () => {
    return configApi.fetchConfig();
  },
};

/**
 * React hook to consume cached database reference data (payment methods, VAT rates, categories)
 */
export function useAppConfig() {
  const [config, setConfig] = useState(() => configApi.getConfig());

  useEffect(() => {
    // If no config has been fetched yet, fetch from DB
    const cached = configStorage.get();
    if (!cached) {
      configApi.fetchConfig().then((fresh) => {
        if (fresh) setConfig(fresh);
      });
    }

    // Listen to storage events to keep tabs and sessions synchronized
    const handleStorage = (e) => {
      if (e.key === CONFIG_CACHE_KEY && e.newValue) {
        try {
          setConfig(JSON.parse(e.newValue));
        } catch {
          // ignore parse error
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return {
    paymentMethods: config?.payment_methods || DEFAULT_CONFIG.payment_methods,
    vatRates: config?.vat_rates || DEFAULT_CONFIG.vat_rates,
    categories: config?.categories || DEFAULT_CONFIG.categories,
    merchants: config?.common_merchants || DEFAULT_CONFIG.common_merchants,
    refetch: configApi.fetchConfig,
  };
}
