import { currentLanguage, localeFor, translate } from "@/lib/i18n/dictionaries";

/**
 * Date and payment term utilities for invoices and financial management.
 * Implements Dutch statutory and commercial payment terms (14-day standard norm, 30-day B2B).
 */

/**
 * Calculates a future due date string (YYYY-MM-DD for <input type="date" />)
 * based on today's local date plus specified number of days.
 *
 * @param {number} [days=14] - Number of days to add (default 14 days Dutch norm)
 * @param {Date} [baseDate=new Date()] - Reference date
 * @returns {string} - Formatted date string "YYYY-MM-DD"
 */
export function calculateDueDate(days = 14, baseDate = new Date()) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + Number(days || 0));

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Determines the payment term days based on the chosen payment method.
 * In the Netherlands, 14 days is the statutory and standard norm for invoices and digital requests.
 * 30 days is customary for B2B invoices (Net 30).
 *
 * @param {string} method - Selected payment method string
 * @returns {number} - 14 or 30 days
 */
export function getTermDaysFromMethod(method = "") {
  if (!method) return 14;

  const m = method.toLowerCase();
  if (m.includes("30") || m.includes("net 30")) {
    return 30;
  }
  // Default to 14 days for "Factuur (Net 14)", Tikkie, QR, PIN, Cash, and any other method
  return 14;
}

/**
 * Parses a date string. Date-only "YYYY-MM-DD" is read as local midnight instead of UTC,
 * so it doesn't shift a day back in timezones behind UTC.
 *
 * @param {string} dateStr - Input date string
 * @returns {Date}
 */
export function parseLocalDate(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(dateStr);
}

/**
 * Formats a YYYY-MM-DD or date string as a short date in the user's language
 * (e.g. "8 nov. 2026" in Dutch, "8 Nov 2026" in English).
 *
 * @param {string|Date} dateVal - Input date
 * @returns {string}
 */
export function formatDate(dateVal) {
  if (!dateVal) return "";
  try {
    const d = typeof dateVal === "string" ? parseLocalDate(dateVal) : dateVal;
    if (Number.isNaN(d.getTime())) return String(dateVal);

    return new Intl.DateTimeFormat(localeFor(currentLanguage()), {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return String(dateVal);
  }
}

/**
 * Relative due date label in the user's language, e.g. "Vervalt over 3 dagen".
 *
 * @param {string} dueDateStr - "YYYY-MM-DD"
 * @param {string} [status="Pending"] - Invoice status
 * @returns {string}
 */
export function getRelativeDueDateLabel(dueDateStr, status = "Pending") {
  const t = (key, vars) => translate(currentLanguage(), `dueDate.${key}`, vars);
  if (status === "Paid") return t("paid");
  if (status === "Draft") return t("draft");
  if (!dueDateStr) return t("default");

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = parseLocalDate(dueDateStr);
    due.setHours(0, 0, 0, 0);

    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t("today");
    if (diffDays === 1) return t("tomorrow");
    if (diffDays > 1) return t("inDays", { count: diffDays });
    if (diffDays === -1) return t("oneDayLate");
    return t("daysLate", { count: Math.abs(diffDays) });
  } catch {
    return t("default");
  }
}
