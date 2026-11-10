import { currentLanguage, translate } from "@/lib/i18n/dictionaries";

const DEFAULT_BASE_URL = "http://localhost:8085";

/** Fired on window when a request comes back 401: the session is no longer valid */
export const UNAUTHORIZED_EVENT = "ff:unauthorized";

/** Tells the auth layer that the session expired, so it can log out and redirect */
export function notifyUnauthorized() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
}

export class ApiClientError extends Error {
  constructor(message, status, payload = null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
    this.isUnauthorized = status === 401;
    this.isForbidden = status === 403;
    this.isConflict = status === 409;
    this.isRateLimit = status === 429;
  }
}

/**
 * Gets base API URL from environment or fallback
 */
export function getApiBaseUrl() {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, "");
  }
  return DEFAULT_BASE_URL;
}

/**
 * Makes a URL returned by the backend usable in <img src> or <a href>.
 * Paths like "/api/v1/receipts/rec_1" are served by the API, not by Next.js,
 * so they get the API base URL in front. Absolute, data: and blob: URLs stay as they are.
 * @param {string | null | undefined} url
 */
export function resolveApiUrl(url) {
  if (!url) return url ?? null;
  if (url.startsWith("/") && !url.startsWith("//")) {
    return `${getApiBaseUrl()}${url}`;
  }
  return url;
}

/**
 * Low-level HTTP request wrapper using native fetch
 * Sends `credentials: 'include'` to support HttpOnly cookies
 *
 * @template T
 * @param {string} endpoint - Path, e.g. '/api/v1/auth/login'
 * @param {RequestInit & { token?: string; skipAuthRedirect?: boolean }} [options]
 *   skipAuthRedirect: a 401 here means something else than an expired session
 *   (wrong password on login or when confirming a change), so don't log out.
 * @returns {Promise<T>}
 */
export async function apiRequest(endpoint, options = {}) {
  const {
    token,
    headers = {},
    skipAuthRedirect = false,
    ...restOptions
  } = options;
  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;

  const requestHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...headers,
  };

  // Dual auth transport: attach Bearer token if provided
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...restOptions,
      // CRITICAL: sends and receives HttpOnly cookies across origin
      credentials: "include",
      headers: requestHeaders,
    });

    // Parse JSON safely or fallback to text
    let data = null;
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      data = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => "");
      data = text ? { message: text } : null;
    }

    if (!response.ok) {
      if (response.status === 401 && !skipAuthRedirect) {
        notifyUnauthorized();
      }
      const errorMessage =
        data?.error ||
        data?.message ||
        translate(currentLanguage(), "errors.requestFailed", {
          status: response.status,
        });
      throw new ApiClientError(errorMessage, response.status, data);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw new ApiClientError(
      translate(currentLanguage(), "errors.network"),
      0,
      null,
    );
  }
}
