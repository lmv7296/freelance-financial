const DEFAULT_BASE_URL = "http://localhost:8080";

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
 * Low-level HTTP request wrapper using native fetch
 * Sends `credentials: 'include'` to support HttpOnly cookies
 *
 * @template T
 * @param {string} endpoint - Path, e.g. '/api/v1/auth/login'
 * @param {RequestInit & { token?: string }} [options]
 * @returns {Promise<T>}
 */
export async function apiRequest(endpoint, options = {}) {
  const { token, headers = {}, ...restOptions } = options;
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
      const errorMessage =
        data?.error ||
        data?.message ||
        `Request failed with status ${response.status}`;
      throw new ApiClientError(errorMessage, response.status, data);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw new ApiClientError(
      err?.message || "Netwerkfout bij verbinden met de server",
      0,
      null,
    );
  }
}
