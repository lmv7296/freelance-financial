"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { settingsApi } from "@/lib/api/settings";
import { useAuth } from "@/lib/auth/AuthContext";
import { DEFAULT_LANGUAGE, translate } from "@/lib/i18n/dictionaries";

// Read by the inline script in the root layout to apply the theme before first paint
export const PREFERENCES_STORAGE_KEY = "ff_preferences";

const DEFAULT_PREFERENCES = { language: DEFAULT_LANGUAGE, theme: "system" };

const PreferencesContext = createContext(null);

function readCache() {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(prefs) {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable
  }
}

/**
 * Language and theme for the current user.
 * Applied immediately from the local cache, then synced with /api/v1/me/preferences.
 */
export function PreferencesProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);

  // Apply cached preferences after mount (localStorage isn't available during SSR)
  useEffect(() => {
    const cached = readCache();
    if (cached) setPreferences((prev) => ({ ...prev, ...cached }));
  }, []);

  // Sync from the backend once logged in
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    settingsApi
      .getPreferences()
      .then((res) => {
        if (cancelled || !res?.preferences) return;
        const { language, theme } = res.preferences;
        const next = {
          language: language || DEFAULT_LANGUAGE,
          theme: theme || "system",
        };
        setPreferences(next);
        writeCache(next);
      })
      .catch(() => {
        // Keep cached/default preferences when the backend isn't available
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Theme: toggle the `dark` class on <html>, following the OS when set to "system"
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const isDark =
        preferences.theme === "dark" ||
        (preferences.theme === "system" && media.matches);
      root.classList.toggle("dark", isDark);
    };
    apply();
    if (preferences.theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preferences.theme]);

  useEffect(() => {
    document.documentElement.lang = preferences.language;
  }, [preferences.language]);

  /**
   * Change language and/or theme: applied and cached on this device right away, then saved
   * to the backend. Resolves to `{ synced: false }` when only the local save worked.
   */
  const updatePreferences = useCallback(async (patch) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      writeCache(next);
      return next;
    });
    try {
      await settingsApi.updatePreferences(patch);
      return { synced: true };
    } catch {
      return { synced: false };
    }
  }, []);

  const t = useCallback(
    (key, vars) => translate(preferences.language, key, vars),
    [preferences.language],
  );

  return (
    <PreferencesContext.Provider
      value={{ ...preferences, updatePreferences, t }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}

/** Shorthand for components that only need translations */
export function useT() {
  return usePreferences().t;
}
