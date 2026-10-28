import { apiRequest } from "./client";

const TOKEN_KEY = "ff_session_token";
const USER_KEY = "ff_session_user";

export const tokenStorage = {
  getToken: () => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken: (token) => {
    if (typeof window === "undefined") return;
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // storage unavailable
    }
  },
  clearToken: () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // storage unavailable
    }
  },
  getUser: () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => {
    if (typeof window === "undefined") return;
    try {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch {
      // storage unavailable
    }
  },
  clearUser: () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      // storage unavailable
    }
  },
  clearAll: () => {
    tokenStorage.clearToken();
    tokenStorage.clearUser();
  },
};

/**
 * High-level authentication API functions
 */
export const authApi = {
  /**
   * Register a new user
   * @param {{ email: string; password: string }} payload
   * @returns {Promise<{ user: { id: string; email: string; created_at: string; updated_at: string } }>}
   */
  register: async (payload) => {
    return apiRequest("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email.trim(),
        password: payload.password,
      }),
    });
  },

  /**
   * Log into an existing account
   * Sets HttpOnly session cookie on the browser and returns bearer token + user
   * @param {{ email: string; password: string }} payload
   * @returns {Promise<{ token: string; expires_at: string; user: { id: string; email: string; created_at: string; updated_at: string } }>}
   */
  login: async (payload) => {
    const data = await apiRequest("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email.trim(),
        password: payload.password,
      }),
    });

    if (data?.token) {
      tokenStorage.setToken(data.token);
    }
    if (data?.user) {
      tokenStorage.setUser(data.user);
    }

    return data;
  },

  /**
   * Log out of current session
   * Revokes session on server, expires cookie, and clears stored credentials
   * @param {string} [tokenOverride]
   * @returns {Promise<{ message: string }>}
   */
  logout: async (tokenOverride) => {
    const token = tokenOverride || tokenStorage.getToken();
    try {
      const result = await apiRequest("/api/v1/auth/logout", {
        method: "POST",
        token: token || undefined,
      });
      return result;
    } finally {
      tokenStorage.clearAll();
    }
  },

  /**
   * Check backend health
   * @returns {Promise<{ status: string; timestamp: string; version: string }>}
   */
  checkHealth: async () => {
    try {
      return await apiRequest("/healthz", { method: "GET" });
    } catch {
      return await apiRequest("/api/v1/health", { method: "GET" });
    }
  },
};
