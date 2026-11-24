/**
 * Format checks for Dutch business details. They check the format only, not whether a
 * number is actually registered.
 */

/** KvK-nummer: 8 digits */
export function isValidKvk(value) {
  return /^\d{8}$/.test(String(value).replace(/\s/g, ""));
}

/** Btw-identificatienummer: NL + 9 digits + B + 2 digits, e.g. NL123456789B01 */
export function isValidVatNumber(value) {
  return /^NL\d{9}B\d{2}$/.test(
    String(value).replace(/[\s.]/g, "").toUpperCase(),
  );
}

/** Dutch postal code: 4 digits (first not 0) + 2 letters, e.g. 1016 HE */
export function isValidPostalCodeNL(value) {
  return /^[1-9]\d{3}\s?[A-Z]{2}$/i.test(String(value).trim());
}

/** IBAN with the ISO 13616 mod-97 checksum */
export function isValidIban(value) {
  const iban = String(value).replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of digits) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

/** Groups an IBAN in blocks of 4 for display */
export function formatIban(value) {
  return String(value)
    .replace(/\s/g, "")
    .toUpperCase()
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

/** Phone number with optional +, 8 to 15 digits after removing spaces and dashes */
export function isValidPhone(value) {
  return /^\+?\d{8,15}$/.test(String(value).replace(/[\s\-()]/g, ""));
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
}
