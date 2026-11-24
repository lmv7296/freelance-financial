// ---------------------------------------------------------------------------
// The logged-in user, as returned by login, /api/v1/auth/me and /api/v1/me/profile.
// The business fields live on the companies table; the backend joins them in here.
// See docs/onboarding-backend.md
// ---------------------------------------------------------------------------

export type LegalForm = "eenmanszaak" | "vof" | "bv";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null; // E.164, e.g. "+31612345678"
  country: string | null; // companies.country, ISO 3166-1 alpha-2, e.g. "NL"
  business_name: string | null; // companies.name
  vat_number: string | null; // companies.vat_number, optional
  legal_form: LegalForm | null; // companies.legal_form
  tax_regime: string | null; // companies.tax_regime, set by the backend, e.g. "NL_BTW_STANDARD"
  is_verified: boolean; // email address confirmed via the link in the email
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Fields the user fills in during onboarding (PATCH /api/v1/me/profile) */
export type UpdateProfileRequest = Partial<
  Pick<
    User,
    | "full_name"
    | "phone_number"
    | "country"
    | "business_name"
    | "vat_number"
    | "legal_form"
  >
>;
