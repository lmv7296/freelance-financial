"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authApi, tokenStorage, USER_KEY } from "@/lib/api/auth";
import { ApiClientError, UNAUTHORIZED_EVENT } from "@/lib/api/client";
import { configApi, configStorage } from "@/lib/api/config";

const AuthContext = createContext(null);

// setTimeout can't wait longer than ~24.8 days
const MAX_TIMEOUT_MS = 2_147_483_647;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  // True when the user was logged out because the session ended, not by choice
  const [sessionExpired, setSessionExpired] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);

  // Modal UI state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");

  const expireSession = useCallback(() => {
    tokenStorage.clearAll();
    setUser(null);
    setToken(null);
    setExpiresAt(null);
    setSessionExpired(true);
  }, []);

  // Hydrate user and token from storage on client mount, then ask the backend
  // whether that session is still valid before showing any protected page
  useEffect(() => {
    let cancelled = false;
    const storedUser = tokenStorage.getUser();
    const storedToken = tokenStorage.getToken();
    const storedExpiresAt = tokenStorage.getExpiresAt();

    // If logged in or missing cached config, fetch reference data from DB once
    if (!configStorage.get()) {
      configApi.fetchConfig().catch(() => {});
    }

    if (!storedUser) {
      setIsLoading(false);
      return;
    }
    if (storedExpiresAt && new Date(storedExpiresAt) <= new Date()) {
      expireSession();
      setIsLoading(false);
      return;
    }

    authApi
      .me()
      .then((response) => {
        if (cancelled) return;
        const freshUser = response?.user ?? storedUser;
        tokenStorage.setUser(freshUser);
        setUser(freshUser);
        setToken(storedToken);
        setExpiresAt(storedExpiresAt);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.isUnauthorized) {
          expireSession();
        } else {
          // Backend unreachable: keep the session, requests will retry later
          setUser(storedUser);
          setToken(storedToken);
          setExpiresAt(storedExpiresAt);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [expireSession]);

  // Any request that comes back 401 means the session is gone
  useEffect(() => {
    const handleUnauthorized = () => {
      if (tokenStorage.getUser()) expireSession();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [expireSession]);

  // Log out when the session's expiry time passes while the app is open
  useEffect(() => {
    if (!user || !expiresAt) return;
    const msLeft = new Date(expiresAt).getTime() - Date.now();
    if (Number.isNaN(msLeft)) return;
    if (msLeft <= 0) {
      expireSession();
      return;
    }
    const timer = setTimeout(expireSession, Math.min(msLeft, MAX_TIMEOUT_MS));
    return () => clearTimeout(timer);
  }, [user, expiresAt, expireSession]);

  // Keep tabs in sync: logging in or out in one tab applies to all of them
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key !== USER_KEY && e.key !== null) return;
      const storedUser = tokenStorage.getUser();
      setUser(storedUser);
      setToken(storedUser ? tokenStorage.getToken() : null);
      setExpiresAt(storedUser ? tokenStorage.getExpiresAt() : null);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Handle 429 Rate Limit countdown timer
  useEffect(() => {
    if (rateLimitCountdown <= 0) return;

    const timer = setInterval(() => {
      setRateLimitCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitCountdown]);

  const handleRateLimitError = useCallback((err) => {
    if (err instanceof ApiClientError && err.isRateLimit) {
      setRateLimitCountdown(60);
    }
  }, []);

  const login = useCallback(
    async ({ email, password }) => {
      try {
        const response = await authApi.login({ email, password });
        setUser(response.user);
        setToken(response.token);
        setExpiresAt(response.expires_at ?? null);
        setSessionExpired(false);
        setAuthModalOpen(false);

        // Fetch VAT rates, payment methods, etc. from DB once on login and cache them
        configApi.refreshOnLogin().catch(() => {});

        return response;
      } catch (err) {
        handleRateLimitError(err);
        throw err;
      }
    },
    [handleRateLimitError],
  );

  const register = useCallback(
    async ({ email, password }) => {
      try {
        const response = await authApi.register({ email, password });
        // Automatically attempt login right after registration for smooth UX
        try {
          const loginResponse = await authApi.login({ email, password });
          setUser(loginResponse.user);
          setToken(loginResponse.token);
          setExpiresAt(loginResponse.expires_at ?? null);
          setSessionExpired(false);
          setAuthModalOpen(false);

          // Fetch VAT rates, payment methods from DB once on login and cache them
          configApi.refreshOnLogin().catch(() => {});

          return loginResponse;
        } catch {
          // If auto-login fails, switch modal to login mode
          setAuthModalMode("login");
          return response;
        }
      } catch (err) {
        handleRateLimitError(err);
        throw err;
      }
    },
    [handleRateLimitError],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout(token);
    } catch (err) {
      console.warn("Backend logout warning:", err);
    } finally {
      setUser(null);
      setToken(null);
      setExpiresAt(null);
      setSessionExpired(false);
      tokenStorage.clearAll();
    }
  }, [token]);

  /** Replace the stored user, e.g. after saving the profile or verifying the email */
  const updateUser = useCallback((nextUser) => {
    tokenStorage.setUser(nextUser);
    setUser(nextUser);
  }, []);

  const openLogin = useCallback(() => {
    setAuthModalMode("login");
    setAuthModalOpen(true);
  }, []);

  const openRegister = useCallback(() => {
    setAuthModalMode("register");
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user),
    isLoading,
    sessionExpired,
    rateLimitCountdown,
    authModalOpen,
    authModalMode,
    setAuthModalMode,
    openLogin,
    openRegister,
    closeAuthModal,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
