// ---------------------------------------------------------------------------
// Settings. Company-wide: /api/v1/settings/*. Personal: /api/v1/me/*.
// See docs/settings-backend.md
// ---------------------------------------------------------------------------

export type Language = "nl" | "en";
export type ThemePreference = "system" | "light" | "dark";

export interface NotificationPreferences {
  vat_deadline_reminder: boolean;
  vat_deadline_days_before: number; // e.g. 3, 7 or 14
  receipts_to_review: "off" | "instant" | "daily";
  overdue_invoices: boolean;
  income_tax_deadline_reminder: boolean;
}

export interface UserPreferences {
  language: Language;
  theme: ThemePreference;
  notifications: NotificationPreferences;
  updated_at: string;
}

export interface CompanySettings {
  company_name: string | null; // statutaire / KvK-naam
  trade_name: string | null; // handelsnaam shown on invoices
  kvk_number: string | null; // 8 digits
  vat_number: string | null; // btw-identificatienummer, NL + 9 digits + B + 2 digits
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null; // ISO 3166-1 alpha-2, e.g. "NL"
  email: string | null;
  phone: string | null;
  website: string | null;
  iban: string | null;
  logo_url: string | null;
  updated_at: string;
}

export interface InvoiceDefaults {
  payment_term_days: number;
  number_prefix: string; // e.g. "INV-2026-"
  next_number: number;
  number_padding: number; // e.g. 4 -> 0042
  default_vat_rate: number; // must be one of the rates from /api/v1/config
  default_payment_method: string | null;
  footer_text: string | null;
  updated_at: string;
}

export interface QuickSelectMerchant {
  name: string;
  category: string | null; // pre-fills the category when the shop is picked
}

export interface CompanyLists {
  merchants: QuickSelectMerchant[]; // "Snelle selectie" in Nieuwe uitgave, in this order
  categories: string[];
  payment_methods: string[];
}

export interface WhatsAppSender {
  id: string;
  name: string;
  phone: string; // E.164, e.g. "+31612345678"
  active: boolean;
  receipts_count: number;
  created_at: string;
}

export interface WhatsAppSettings {
  receiving_number: string | null; // the number workers send receipts to
  senders: WhatsAppSender[];
}
