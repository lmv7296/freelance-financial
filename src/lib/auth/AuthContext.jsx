"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authApi, tokenStorage } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // Modal UI state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");

  // Hydrate user and token from storage on client mount
  useEffect(() => {
    const storedUser = tokenStorage.getUser();
    const storedToken = tokenStorage.getToken();
    if (storedUser) setUser(storedUser);
    if (storedToken) setToken(storedToken);
    setIsLoading(false);
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
        setAuthModalOpen(false);
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
          setAuthModalOpen(false);
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
      tokenStorage.clearAll();
    }
  }, [token]);

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
