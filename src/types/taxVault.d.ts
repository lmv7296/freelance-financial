// ---------------------------------------------------------------------------
// Tax Vault: estimates and accountant exports. All figures are calculated by the
// backend from tax rules stored in the database. See docs/tax-vault-backend.md
// All amounts are decimal euros (e.g. 1250.5 = €1.250,50).
// ---------------------------------------------------------------------------

export type LegalForm = "eenmanszaak" | "bv";
export type VatFilingFrequency = "month" | "quarter" | "year";

export interface TaxProfile {
  legal_form: LegalForm;
  vat_filing_frequency: VatFilingFrequency;
  uses_kor: boolean; // kleineondernemersregeling
  meets_hours_criterion: boolean | null; // urencriterium, null = unknown
  is_starter: boolean;
  reached_aow_age: boolean;
  other_box1_income: number | null; // e.g. salary from an employer, per year
  provisional_assessment_monthly: number | null; // voorlopige aanslag paid per month
  accountant_name: string | null;
  accountant_email: string | null;
  default_export_formats: string[]; // keys from ExportFormatOption
  updated_at: string;
}

export interface TaxRuleUsed {
  key: string;
  label: string;
  value_type: string;
  value: unknown;
  display_value: string; // formatted by the backend, e.g. "12,70%" or "€ 1.200"
  tax_year: number;
  source_url: string;
  verified_at: string; // YYYY-MM-DD
}

export interface TaxWarning {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface VatRubriek {
  code: string; // "1a", "1b", "2a", "5a", "5b", ...
  label: string;
  turnover: number | null; // "Omzet" column, null when not applicable
  vat: number | null; // "Btw" column
}

export interface VatPeriod {
  key: string; // e.g. "2026-Q3"
  label: string; // e.g. "3e kwartaal 2026"
  start_date: string;
  end_date: string;
  deadline: string; // filing and payment deadline
  status: "open" | "to_file" | "filed" | "paid";
  is_estimate: boolean; // true while the period is still running
  vat_due: number; // 5a
  input_vat: number; // 5b
  balance: number; // 5a - 5b, positive = to pay, negative = refund
  rubrieken: VatRubriek[];
}

export interface TaxCalculationStep {
  key: string;
  label: string;
  amount: number;
  kind: "income" | "deduction" | "subtotal" | "tax" | "credit" | "total";
  rule_key: string | null; // links to rules_used[].key
  note: string | null;
}

export interface TaxScenario {
  basis_label: string; // e.g. "Werkelijke cijfers t/m oktober"
  profit: number;
  taxable_income: number;
  total_tax: number; // all components below, before provisional payments
  provisional_assessment_paid: number;
  still_to_pay: number;
  effective_rate: number; // total_tax / profit, as decimal
  components: { key: string; label: string; amount: number }[]; // e.g. IB, Zvw
  steps: TaxCalculationStep[];
}

export interface IncomeTaxEstimate {
  status: "available" | "unavailable";
  kind: "inkomstenbelasting" | "vennootschapsbelasting" | string;
  label: string;
  projection_method: string | null; // explained to the user
  to_date: TaxScenario | null;
  projected: TaxScenario | null;
}

export interface SetAsideAdvice {
  monthly_amount: number;
  months_remaining: number;
  components: { key: string; label: string; amount: number }[];
  explanation: string;
}

export interface TaxDeadline {
  key: string;
  date: string;
  type: "vat_return" | "income_tax_return" | "payment" | "other";
  label: string;
  description: string | null;
  status: "upcoming" | "due_soon" | "overdue" | "done";
  amount: number | null; // estimated amount, if known
  source_url: string | null;
}

export interface TaxVaultOverview {
  tax_year: number;
  available_years: number[];
  legal_form: LegalForm;
  generated_at: string;
  profile_complete: boolean;
  totals: {
    revenue_excl_vat: number;
    expenses_excl_vat: number;
    profit: number;
    unreviewed_expenses_count: number;
  };
  vat: { enabled: boolean; periods: VatPeriod[] };
  income_tax: IncomeTaxEstimate;
  set_aside: SetAsideAdvice | null;
  deadlines: TaxDeadline[];
  warnings: TaxWarning[];
  rules_used: TaxRuleUsed[];
}

export interface ExportFormatOption {
  key: string; // e.g. "xlsx", "csv", "pdf_summary", "receipts_zip", "xaf"
  label: string;
  description: string;
}

export interface CreateTaxExportRequest {
  tax_year: number;
  period_key: string; // a VatPeriod key, or "year"
  formats: string[];
  send_to_accountant: boolean;
  note: string | null;
  save_as_default: boolean;
}

export interface TaxExport {
  id: string;
  tax_year: number;
  period_key: string;
  period_label: string;
  formats: string[];
  status: "pending" | "ready" | "failed";
  download_url: string | null;
  sent_to: string | null; // accountant email, if sent
  error: string | null;
  created_at: string;
}
