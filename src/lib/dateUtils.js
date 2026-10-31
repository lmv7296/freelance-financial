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
 * Formats a YYYY-MM-DD or date string to Dutch readable date (e.g. "8 nov. 2026").
 *
 * @param {string|Date} dateVal - Input date
 * @returns {string} - Human readable Dutch date
 */
export function formatDutchDate(dateVal) {
  if (!dateVal) return "";
  try {
    const d = typeof dateVal === "string" ? parseLocalDate(dateVal) : dateVal;
    if (Number.isNaN(d.getTime())) return String(dateVal);

    return new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return String(dateVal);
  }
}

/**
 * Calculates relative days remaining from today until the due date.
 *
 * @param {string} dueDateStr - "YYYY-MM-DD"
 * @param {string} [status="Pending"] - Invoice status
 * @returns {string} - e.g. "Binnen 14 dagen", "Binnen 30 dagen", "Vandaag vervallen", etc.
 */
export function getRelativeDueDateLabel(dueDateStr, status = "Pending") {
  if (status === "Paid") return "Direct voldaan";
  if (status === "Draft") return "Concept factuur";
  if (!dueDateStr) return "Binnen 14 dagen";

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);

    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Vervalt vandaag";
    if (diffDays === 1) return "Vervalt morgen";
    if (diffDays > 1) return `Binnen ${diffDays} dagen`;
    if (diffDays === -1) return "1 dag vervallen";
    return `${Math.abs(diffDays)} dagen vervallen`;
  } catch {
    return "Binnen 14 dagen";
  }
}
