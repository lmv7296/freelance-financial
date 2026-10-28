/**
 * Currency and financial formatting utilities.
 * Designed as reusable building blocks for invoices, quotes, receipts and summaries.
 */

/**
 * Formats a numeric value into a localized currency string.
 * Supports EUR, USD, GBP and extensible options.
 *
 * @param {number|string} value - The numeric value to format.
 * @param {string} [currency="EUR"] - Currency code (e.g. 'EUR', 'USD', 'GBP').
 * @param {string} [locale="nl-NL"] - Target locale (defaults to Dutch 'nl-NL').
 * @param {Intl.NumberFormatOptions} [options={}] - Additional Intl options.
 * @returns {string} Formatted currency string.
 */
export function formatCurrency(
  value,
  currency = "EUR",
  locale = "nl-NL",
  options = {},
) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(String(value)) || 0;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(numericValue);
}

/**
 * Helper specifically for Euro formatting in the Netherlands locale.
 *
 * @param {number|string} value - The amount in euros.
 * @param {Intl.NumberFormatOptions} [options={}] - Optional formatting options.
 * @returns {string} Formatted euro string (e.g. "€ 1.250,00").
 */
export function formatEuro(value, options = {}) {
  return formatCurrency(value, "EUR", "nl-NL", options);
}

/**
 * Cleans and safely parses user input (e.g. "1.250,50" or "€65.00") into a clean float.
 *
 * @param {string|number} input - Raw user input.
 * @returns {number} Parsed float number.
 */
export function parseCurrency(input) {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (!input) return 0;

  const cleaned = String(input)
    .replace(/[^0-9.,-]/g, "")
    .replace(",", ".");

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Calculates subtotal, vat amount and total for a list of line items.
 *
 * @param {Array<{quantity: number|string, unitPrice: number|string}>} items
 * @param {number|string} [vatRate=21]
 * @returns {{subtotal: number, vatRate: number, vatAmount: number, total: number}}
 */
export function calculateLineItemsTotals(items = [], vatRate = 21) {
  const list = Array.isArray(items) ? items : [];

  const subtotal = list.reduce((sum, it) => {
    const q = Number.parseFloat(it.quantity) || 0;
    const p = parseCurrency(it.unitPrice);
    return sum + q * p;
  }, 0);

  const rate = Number.parseFloat(vatRate) || 0;
  const vatAmount = subtotal * (rate / 100);
  const total = subtotal + vatAmount;

  return {
    subtotal,
    vatRate: rate,
    vatAmount,
    total,
  };
}
