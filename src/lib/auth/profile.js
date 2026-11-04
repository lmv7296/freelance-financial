/**
 * Onboarding rules: which profile fields a user must fill in before using the app.
 */

/** Legal forms, stored as companies.legal_form */
export const LEGAL_FORMS = ["eenmanszaak", "vof", "bv"];

/** vat_number is optional: a new business may not have its btw-id yet */
export const REQUIRED_PROFILE_FIELDS = [
  "full_name",
  "phone_number",
  "country",
  "business_name",
  "legal_form",
];

/** @param {Partial<import("@/types/user").User> | null} user */
export function isProfileComplete(user) {
  if (!user) return false;
  return REQUIRED_PROFILE_FIELDS.every((field) =>
    String(user[field] ?? "").trim(),
  );
}
