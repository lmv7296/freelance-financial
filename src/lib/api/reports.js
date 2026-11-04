import { tokenStorage } from "./auth";
import {
  ApiClientError,
  apiRequest,
  getApiBaseUrl,
  notifyUnauthorized,
} from "./client";

/**
 * Reads the file name from a Content-Disposition header.
 * Prefers the UTF-8 `filename*` form, falls back to `filename`.
 * @param {string | null} header
 */
function filenameFromDisposition(header) {
  if (!header) return null;
  const encoded = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // fall through to the plain filename
    }
  }
  const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain ? plain[1].trim() : null;
}

/** Hands a blob to the browser as a download (it lands in the Downloads folder) */
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the blob
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/**
 * Reports API
 * The backend builds the report from the user's invoices and expenses and returns the file.
 * See docs/reports-backend.md and src/types/reports.d.ts for the contract.
 */
export const reportsApi = {
  /**
   * Which reports and formats the backend supports, and which years have data
   * @returns {Promise<import("@/types/reports").ReportOptions>}
   */
  getOptions: async () => {
    const data = await apiRequest("/api/v1/reports/options", {
      method: "GET",
      token: tokenStorage.getToken() || undefined,
    });
    // Go sends unset slices as null
    return {
      reports: Array.isArray(data?.reports)
        ? data.reports.map((r) => ({
            ...r,
            formats: Array.isArray(r.formats) ? r.formats : [],
          }))
        : [],
      available_years: Array.isArray(data?.available_years)
        ? data.available_years
        : [],
    };
  },

  /**
   * Generates a report and saves it to the user's downloads
   * @param {import("@/types/reports").ReportKey} key
   * @param {import("@/types/reports").ReportRequest} request
   * @returns {Promise<{ filename: string }>}
   */
  download: async (key, { format, from, to, lang }) => {
    const query = new URLSearchParams({ format, from, to, lang });
    const token = tokenStorage.getToken();
    let response;
    try {
      response = await fetch(
        `${getApiBaseUrl()}/api/v1/reports/${encodeURIComponent(key)}?${query}`,
        {
          method: "GET",
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
    } catch (err) {
      throw new ApiClientError(
        err?.message || "Netwerkfout bij verbinden met de server",
        0,
      );
    }

    if (!response.ok) {
      if (response.status === 401) notifyUnauthorized();
      const data = await response.json().catch(() => null);
      throw new ApiClientError(
        data?.error || data?.message || `Request failed (${response.status})`,
        response.status,
        data,
      );
    }

    const blob = await response.blob();
    const filename =
      filenameFromDisposition(response.headers.get("content-disposition")) ||
      `${key}_${from}_${to}.${format}`;
    saveBlob(blob, filename);
    return { filename };
  },
};
