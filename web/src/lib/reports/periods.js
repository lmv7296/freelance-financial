/**
 * Report periods: turns the choice in the download pop-up (month, quarter, year or
 * custom dates) into the from/to dates the backend expects (YYYY-MM-DD, inclusive).
 */

export const PERIOD_TYPES = ["month", "quarter", "year", "custom"];

const pad = (n) => String(n).padStart(2, "0");

/** Local date → "YYYY-MM-DD" (toISOString would shift it to UTC) */
export const toIsoDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const lastDayOfMonth = (year, month) => new Date(year, month, 0).getDate();

/**
 * @param {{ type: string, year: number, month: number, quarter: number, from: string, to: string }} period
 *   month is 1-12, quarter is 1-4
 * @returns {{ from: string, to: string } | null} null when custom dates are missing or reversed
 */
export function periodRange({ type, year, month, quarter, from, to }) {
  if (type === "month") {
    return {
      from: `${year}-${pad(month)}-01`,
      to: `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}`,
    };
  }
  if (type === "quarter") {
    const firstMonth = (quarter - 1) * 3 + 1;
    const lastMonth = firstMonth + 2;
    return {
      from: `${year}-${pad(firstMonth)}-01`,
      to: `${year}-${pad(lastMonth)}-${pad(lastDayOfMonth(year, lastMonth))}`,
    };
  }
  if (type === "year") {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  if (!from || !to || from > to) return null;
  return { from, to };
}

/** The period the pop-up starts with: the current quarter */
export function defaultPeriod(today = new Date()) {
  const iso = toIsoDate(today);
  return {
    type: "quarter",
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    quarter: Math.floor(today.getMonth() / 3) + 1,
    from: `${today.getFullYear()}-01-01`,
    to: iso,
  };
}

/**
 * "1 jul. 2026 – 30 sep. 2026" in the user's language
 * @param {{ from: string, to: string }} range
 * @param {string} language
 */
export function formatRange({ from, to }, language) {
  const format = new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const parse = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  return `${format.format(parse(from))} – ${format.format(parse(to))}`;
}

/** Month names for the month picker, in the user's language */
export function monthNames(language) {
  const format = new Intl.DateTimeFormat(language, { month: "long" });
  return Array.from({ length: 12 }, (_, i) => format.format(new Date(2000, i)));
}
