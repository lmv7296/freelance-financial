# Frontend Integration Guide & Full API Reference

This document provides frontend engineers with everything needed to integrate with the FreelanceFin Go backend API, including authentication flows, all endpoint specifications, TypeScript interfaces, validation rules, error handling, and copy-pasteable client examples (`fetch` and `axios`).

---

## 🌐 1. Base Configuration & CORS

- **Local Base URL:** `http://localhost:8085` (or configured via `PORT` in `.env`)
- **Default Frontend Origins Allowed (CORS):**
  - `http://localhost:3000` (Next.js)
  - `http://localhost:5173` (Vite)
- **Headers Accepted:** `Content-Type: application/json`, `Authorization`, `Accept`
- **CORS Credentials:** `Access-Control-Allow-Credentials: true` is enabled on the server.

> [!IMPORTANT]
> Because the server issues secure **`HttpOnly` cookies**, your frontend HTTP client **MUST** be configured to send credentials:
> - Native `fetch`: `{ credentials: "include" }`
> - `axios`: `{ withCredentials: true }`

---

## 🔑 2. Authentication & Multi-Tenancy Architecture

The backend supports **Dual Authentication Transport**:

1. **Browser Mode (Recommended for Web):**
   - On successful `POST /api/v1/auth/login`, the server issues a `Set-Cookie: session_token=...; HttpOnly; SameSite=Lax; Path=/`.
   - The cookie is automatically stored by the browser and attached to subsequent requests.
   - JavaScript cannot access this cookie directly, making it immune to XSS token theft.
2. **Bearer Token Mode (For Mobile & API Clients):**
   - The login endpoint also returns the token in the JSON response (`{ "token": "..." }`).
   - Pass it via the HTTP header: `Authorization: Bearer <your_token>`.
3. **Session & Security Invalidation:**
   - `POST /api/v1/auth/logout`: Revokes the current session and expires the cookie.
   - `POST /api/v1/auth/logout-all`: Revokes all active sessions across all devices for the user.
   - `POST /api/v1/auth/change-password`: Changes password and revokes all other active sessions.
4. **Company vs User Scoping:**
   - **Company Scoped**: Expenses, receipts, clients, invoices, company profile, invoice defaults, lists, tax profile, tax calculations, WhatsApp senders. All isolated by `company_id`.
   - **User Scoped**: Account email, password, language, theme, notification preferences.

---

## 💶 3. Money & Date Conventions

- **Money in API Responses & Requests**: Decimal euros formatted as standard JSON numbers (e.g. `42.10`, `1200.00`). Never send string currency symbols (`€`).
- **Dates**: `YYYY-MM-DD` for calendar dates (e.g. `"2026-10-31"`).
- **Timestamps**: RFC 3339 strings (e.g. `"2026-10-31T14:30:00Z"`).

---

## 📘 4. TypeScript Interfaces

Copy and paste these definitions into your frontend types (e.g. `src/types/api.ts`):

```typescript
// --- Authentication & User ---
export type TaxRegime = 'eenmanszaak' | 'vof' | 'bv';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  country: string | null;
  business_name: string | null;
  vat_number: string | null;
  tax_regime: TaxRegime | null;
  legal_form?: TaxRegime | null;
  role: 'owner' | 'member';
  is_verified: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  phone_number?: string;
  country?: string;
  business_name?: string;
  vat_number?: string | null;
  tax_regime?: TaxRegime;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface LoginResponse {
  token: string;
  expires_at: string;
  user: User;
}

export interface ApiError {
  error: string;
}

export interface MessageResponse {
  message: string;
}

// --- Reference Data & Lists ---
export interface QuickSelectMerchant {
  name: string;
  category: string | null;
}

export interface CompanyLists {
  merchants: QuickSelectMerchant[];
  categories: string[];
  payment_methods: string[];
}

export interface VatRateOption {
  rate: number;
  label: string;
  value: string;
}

export interface AppConfig {
  payment_methods: string[];
  vat_rates: VatRateOption[];
  categories: string[];
  common_merchants: QuickSelectMerchant[];
}

// --- Expenses ---
export type ExpenseStatus = "processing" | "needs_review" | "approved" | "rejected";

export interface ExpenseVatLine {
  rate: number;
  base_amount: number;
  vat_amount: number;
}

export interface ExpenseLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  vat_rate: number | null;
}

export interface Expense {
  id: string;
  status: ExpenseStatus;
  source: "whatsapp" | "upload" | "manual" | string;
  sender_name: string | null;
  sender_phone: string | null;
  merchant_name: string;
  merchant_address: string | null;
  receipt_date: string | null; // YYYY-MM-DD
  payment_method: string | null;
  category: string | null;
  currency: string;
  subtotal_amount: number | null;
  vat_amount: number | null;
  total_amount: number;
  vat_lines: ExpenseVatLine[];
  line_items: ExpenseLineItem[];
  receipt_url: string;
  receipt_content_type: string | null;
  extraction_confidence: number | null;
  client_id: string | null;
  client_name: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseRequest {
  merchant_name: string;
  merchant_address?: string | null;
  receipt_date?: string | null;
  payment_method?: string | null;
  category?: string | null;
  currency?: string;
  subtotal_amount?: number | null;
  vat_amount?: number | null;
  total_amount: number;
  vat_lines?: ExpenseVatLine[];
  line_items?: ExpenseLineItem[];
  receipt_url?: string; // May be a base64 data: URL (e.g. data:image/jpeg;base64,...)
  receipt_content_type?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  invoice_id?: string | null;
  invoice_number?: string | null;
  notes?: string | null;
  status?: ExpenseStatus;
  source?: string;
}

export type UpdateExpenseRequest = Partial<CreateExpenseRequest>;

export interface Client {
  id: string;
  name: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
}

// --- Settings ---
export interface CompanySettings {
  company_name: string | null;
  trade_name: string | null;
  kvk_number: string | null;
  vat_number: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  iban: string | null;
  logo_url: string | null;
  updated_at: string;
}

export interface InvoiceDefaults {
  payment_term_days: number;
  number_prefix: string;
  next_number: number;
  number_padding: number;
  default_vat_rate: number;
  default_payment_method: string | null;
  footer_text: string | null;
  updated_at: string;
}

export interface WhatsAppSender {
  id: string;
  name: string;
  phone: string; // E.164, e.g. +31612345678
  active: boolean;
  receipts_count: number;
  created_at: string;
}

export interface WhatsAppSettings {
  receiving_number: string | null;
  senders: WhatsAppSender[];
}

export interface NotificationPreferences {
  vat_deadline_reminder: boolean;
  vat_deadline_days_before: number;
  receipts_to_review: "off" | "instant" | "daily";
  overdue_invoices: boolean;
  income_tax_deadline_reminder: boolean;
}

export interface UserPreferences {
  language: "nl" | "en";
  theme: "system" | "light" | "dark";
  notifications: NotificationPreferences;
  updated_at: string;
}

// --- Tax Vault ---
export type LegalForm = "eenmanszaak" | "vof" | "bv";
export type VatFilingFrequency = "month" | "quarter" | "year";

export interface TaxProfile {
  legal_form: LegalForm;
  vat_filing_frequency: VatFilingFrequency;
  uses_kor: boolean;
  meets_hours_criterion: boolean | null; // null = unknown
  is_starter: boolean;
  reached_aow_age: boolean;
  other_box1_income: number | null;
  provisional_assessment_monthly: number | null;
  accountant_name: string | null;
  accountant_email: string | null;
  default_export_formats: string[];
  updated_at: string;
}

export interface TaxRuleUsed {
  key: string;
  label: string;
  value_type: string;
  value: unknown;
  display_value: string; // e.g. "12,70%", "€ 1.200"
  tax_year: number;
  source_url: string;
  verified_at: string;
}

export interface TaxWarning {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface VatRubriek {
  code: string; // "1a", "1b", "2a", "5a", "5b"
  label: string;
  turnover: number | null;
  vat: number | null;
}

export interface VatPeriod {
  key: string; // e.g. "2026-Q1"
  label: string;
  start_date: string;
  end_date: string;
  deadline: string;
  status: "open" | "to_file" | "filed" | "paid";
  is_estimate: boolean;
  vat_due: number;
  input_vat: number;
  balance: number;
  rubrieken: VatRubriek[];
}

export interface TaxCalculationStep {
  key: string;
  label: string;
  amount: number;
  kind: "income" | "deduction" | "subtotal" | "tax" | "credit" | "total";
  rule_key: string | null;
  note: string | null;
}

export interface TaxScenario {
  basis_label: string;
  profit: number;
  taxable_income: number;
  total_tax: number;
  provisional_assessment_paid: number;
  still_to_pay: number;
  effective_rate: number;
  components: { key: string; label: string; amount: number }[];
  steps: TaxCalculationStep[];
}

export interface IncomeTaxEstimate {
  status: "available" | "unavailable";
  kind: string;
  label: string;
  projection_method: string | null;
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
  amount: number | null;
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
  vat: {
    enabled: boolean;
    periods: VatPeriod[];
  };
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
  period_key: string;
  formats: string[];
  send_to_accountant: boolean;
  note?: string | null;
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
  sent_to: string | null;
  error: string | null;
  created_at: string;
}
```

---

## 📡 5. Complete API Endpoints Directory

### 5.1 System & Health Probes

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `GET` | `/healthz` | Public | Liveness probe returning `{"status":"ok"}` |
| `GET` | `/readyz` | Public | Readiness probe returning `{"status":"ready"}` |
| `GET` | `/api/v1/health` | Public | Alias health probe |

---

### 5.2 Authentication, Onboarding & User Security

#### The User Object Across Responses
Endpoints `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `PATCH /api/v1/me/profile`, and `POST /api/v1/auth/verify-email` return the complete user representation (all columns except `password_hash`). Any unfilled fields return `null`:

```json
{
  "user": {
    "id": "usr_123",
    "email": "jan@devriesbouw.nl",
    "full_name": "Jan de Vries",
    "phone_number": "+31612345678",
    "country": "NL",
    "business_name": "De Vries Bouw & Montage",
    "vat_number": "NL123456789B01",
    "tax_regime": "eenmanszaak",
    "is_verified": false,
    "company_id": "cmp_1",
    "created_at": "2026-11-01T10:00:00Z",
    "updated_at": "2026-11-01T10:05:00Z"
  }
}
```
*Note*: The frontend treats the profile as complete when `full_name`, `phone_number`, `country`, `business_name`, and `tax_regime` are all non-null.

#### `POST /api/v1/auth/register`
- **Auth**: Public (Rate-limited: 5 attempts/min)
- **Request Body**:
  ```json
  { "email": "jan@devriesbouw.nl", "password": "Password123!" }
  ```
- **Response `201 Created`**: Returns `{ "user": User }` and dispatches email verification token.

#### `POST /api/v1/auth/login`
- **Auth**: Public (Rate-limited: 5 attempts/min)
- **Request Body**:
  ```json
  { "email": "jan@devriesbouw.nl", "password": "Password123!" }
  ```
- **Response `200 OK`**: Sets `session_token` cookie and returns:
  ```json
  { "token": "...", "expires_at": "2026-11-02T12:00:00Z", "user": { ... } }
  ```

#### `GET /api/v1/auth/me`
- **Auth**: Required
- **Response `200 OK`**: Returns current authenticated user `{ "user": User }`.

#### `PATCH /api/v1/me/profile` (Onboarding Profile Update)
- **Auth**: Required
- **Request Body**: Partial update — send only the fields to be updated:
  ```json
  {
    "full_name": "Jan de Vries",
    "phone_number": "06 1234 5678",
    "country": "NL",
    "business_name": "De Vries Bouw & Montage",
    "tax_regime": "eenmanszaak",
    "vat_number": "NL123456789B01"
  }
  ```
- **Validation (returns 422 Unprocessable Entity with readable message)**:
  - `full_name`, `business_name`: Non-empty after trimming, max 200 characters.
  - `phone_number`: Normalized to E.164 (`06 1234 5678` with country `NL` becomes `+31612345678`).
  - `country`: ISO 3166-1 alpha-2 code, stored uppercase.
  - `tax_regime`: One of `'eenmanszaak'`, `'vof'`, or `'bv'`.
  - `vat_number`: Optional. `null` or empty string clears it. Uppercase, spaces/dots stripped. For NL: `NL` + 9 digits + `B` + 2 digits. Other countries: 2-letter prefix + 2 to 13 letters/digits.
- **Company Synchronization (same transaction)**:
  - `tax_profiles.legal_form = tax_regime` (supports `vof`; tax vault calculation returns `income_tax.status = "unavailable"` with a warning for non-eenmanszaak).
  - Empty `company_settings` fields are synced: `company_name` ← `business_name`, `vat_number` ← `vat_number`, `country` ← `country`, `phone` ← `phone_number`. Does not overwrite fields already set in Settings.
- **Response `200 OK`**: `{ "user": User }`.

#### `POST /api/v1/auth/verify-email`
- **Auth**: Public (Works without being logged in, supporting other devices/browsers)
- **Request Body**:
  ```json
  { "token": "32_byte_hex_token_from_email_link" }
  ```
- **Response `200 OK`**: Sets `is_verified: true`, deletes token, returns `{ "user": User }`.
- **Errors**: `400 Bad Request` with `{ "error": "Ongeldige of verlopen verificatielink" }` if invalid, expired, or already used. (Never returns 401).

#### `POST /api/v1/auth/resend-verification`
- **Auth**: Required
- **Request Body**: None
- **Rate Limit**: 1 request per minute (returns `429 Too Many Requests` if called faster).
- **Behavior**:
  - If user is already verified: returns `200 OK` with `{ "message": "Verificatie-e-mail verzonden" }` without sending email.
  - If unverified: generates a fresh 32-byte URL-safe token (24h expiry) and sends verification email.
- **Response `200 OK`**: `{ "message": "Verificatie-e-mail verzonden" }`.

#### `PATCH /api/v1/me/email`
- **Auth**: Required
- **Request Body**:
  ```json
  { "new_email": "jan.nieuw@devries.nl", "current_password": "Password123!" }
  ```
- **Response `200 OK`**: Returns `{ "user": User }` with `is_verified: false`, creating a new verification token and sending verification email.
- **Errors**: `401 Unauthorized` (incorrect current password), `409 Conflict` (email already taken).

#### `POST /api/v1/auth/change-password`
- **Auth**: Required
- **Request Body**:
  ```json
  { "current_password": "Password123!", "new_password": "NewSecurePassword456!" }
  ```
- **Response `200 OK`**: Returns `{"message": "password updated successfully"}` and invalidates all other active sessions for the user.

#### `POST /api/v1/auth/logout`
- **Auth**: Public / Authenticated
- **Response `200 OK`**: Clears `session_token` cookie and revokes session in DB.

#### `POST /api/v1/auth/logout-all`
- **Auth**: Required
- **Response `200 OK`**: Revokes all active sessions for the user and clears cookie.

---

### 5.3 Reference Data & Company Lists

#### `GET /api/v1/config`
- **Auth**: Required
- **Response `200 OK`**: Returns reference lists, VAT rates, and merchants:
  ```json
  {
    "payment_methods": ["PIN / Betaalpas", "Contant", "iDEAL", "Creditcard", "Overboeking"],
    "vat_rates": [
      { "rate": 21, "label": "21% Hoog (standaard)", "value": "21" },
      { "rate": 9, "label": "9% Laag (verlaagd)", "value": "9" },
      { "rate": 0, "label": "0% Nul / Vrijgesteld", "value": "0" }
    ],
    "categories": ["Bouwmaterialen & Onderdelen", "Gereedschap & Apparatuur", "Brandstof & Vervoer"],
    "common_merchants": [
      { "name": "Bouwmaat", "category": "Bouwmaterialen & Onderdelen" },
      { "name": "Gamma", "category": "Bouwmaterialen & Onderdelen" }
    ]
  }
  ```

#### `GET /api/v1/settings/lists`
- **Auth**: Required
- **Response `200 OK`**: Returns `{ "lists": CompanyLists }`.

#### `PUT /api/v1/settings/lists`
- **Auth**: Required
- **Request Body**:
  ```json
  {
    "merchants": [{ "name": "Bouwmaat", "category": "Bouwmaterialen & Onderdelen" }],
    "categories": ["Bouwmaterialen & Onderdelen", "Gereedschap & Apparatuur"],
    "payment_methods": ["PIN / Betaalpas", "Contant"]
  }
  ```
- **Validation**: Replaces all lists atomically. Rejects empty items or case-insensitive duplicates with `400 Bad Request`.
- **Response `200 OK`**: Returns updated `{ "lists": CompanyLists }`.

---

### 5.4 Expenses, Receipts, Clients & Invoices

#### `GET /api/v1/expenses`
- **Auth**: Required
- **Query Params**:
  - `status` (optional): `processing`, `needs_review`, `approved`, `rejected`
  - `search` (optional): case-insensitive search in merchant name or notes
- **Response `200 OK`**: Returns `{ "expenses": Expense[] }`, ordered newest first.

#### `GET /api/v1/expenses/{id}`
- **Auth**: Required
- **Response `200 OK`**: Returns `{ "expense": Expense }`.

#### `POST /api/v1/expenses`
- **Auth**: Required
- **Request Body**: `CreateExpenseRequest` (Full JSON object).
- **Features**:
  - Request body limit is 15MB to support direct smartphone camera uploads.
  - `receipt_url` can be a base64 Data URL (`data:image/jpeg;base64,...`) or standard URL.
  - Server validates file format (`JPEG`, `PNG`, `WebP`, `HEIC`, `PDF`), decodes and stores it securely, and replaces `receipt_url` with a direct URL (`/api/v1/receipts/{id}`).
  - Client names and invoice numbers are derived server-side from `client_id` / `invoice_id`.
- **Response `201 Created`**: Returns `{ "expense": Expense }`.

#### `PATCH /api/v1/expenses/{id}`
- **Auth**: Required
- **Request Body**: `UpdateExpenseRequest` (partial fields).
- **Allowed Statuses**: `processing`, `needs_review`, `approved`, `rejected`.
- **Response `200 OK`**: Returns `{ "expense": Expense }`.

#### `DELETE /api/v1/expenses/{id}`
- **Auth**: Required
- **Response `200 OK`**: Returns `{"message": "expense deleted successfully"}`.

#### `GET /api/v1/receipts/{id}`
- **Auth**: Required (cookie or Bearer token)
- **Response `200 OK`**: Binary stream of the receipt image or PDF with `Cache-Control: private, max-age=3600`. Only the owning company can access its receipt files.

#### `GET /api/v1/clients`
- **Auth**: Required
- **Response `200 OK`**: Returns `{ "clients": Client[] }`.

#### `GET /api/v1/invoices`
- **Auth**: Required
- **Query Params**: `client_id` (optional)
- **Response `200 OK`**: Returns `{ "invoices": Invoice[] }`.

---

### 5.5 Settings & Company Profile

#### `GET /api/v1/settings/company`
- **Auth**: Required
- **Response `200 OK`**: Returns `{ "company": CompanySettings }`.

#### `PATCH /api/v1/settings/company`
- **Auth**: Required
- **Request Body**: Partial `CompanySettings`.
- **Validation**:
  - KvK: Exactly 8 numeric digits.
  - btw-id: `NL` + 9 digits + `B` + 2 digits (e.g. `NL123456789B01`).
  - Dutch postcode: 4 digits + 2 letters (e.g. `1015 DT`).
  - IBAN: ISO 13616 Mod-97 checksum.
- **Response `200 OK`**: Returns updated `{ "company": CompanySettings }`.

#### `POST /api/v1/settings/company/logo`
- **Auth**: Required
- **Content-Type**: `multipart/form-data` with file field `logo`.
- **Supported Formats**: PNG, JPG/JPEG, SVG (max 2MB). SVGs are sanitized against `<script>` and malicious attributes.
- **Response `200 OK`**: Returns `{ "logo_url": "/api/v1/settings/company/logo" }`.

#### `DELETE /api/v1/settings/company/logo`
- **Auth**: Required
- **Response `200 OK`**: Returns updated `{ "company": CompanySettings }`.

#### `GET /api/v1/settings/company/logo`
- **Auth**: Required
- **Response `200 OK`**: Direct image stream of the company logo.

#### `GET /api/v1/settings/invoice-defaults`
- **Auth**: Required
- **Response `200 OK`**: Returns `{ "invoice_defaults": InvoiceDefaults }`.

#### `PATCH /api/v1/settings/invoice-defaults`
- **Auth**: Required
- **Request Body**: Partial `InvoiceDefaults`.
- **Validation**: `next_number` can never be set lower than an existing invoice number issued by the company.
- **Response `200 OK`**: Returns updated `{ "invoice_defaults": InvoiceDefaults }`.

#### `GET /api/v1/settings/whatsapp`
- **Auth**: Required
- **Response `200 OK`**: Returns `{ "whatsapp": WhatsAppSettings }`.

#### `POST /api/v1/settings/whatsapp/senders`
- **Auth**: Required
- **Request Body**: `{ "name": "Jan de Vries", "phone": "06 1234 5678" }`.
- **Validation**: Phone numbers are normalized to E.164 (`+31612345678`). Duplicate numbers under the same company return `409 Conflict`.
- **Response `201 Created`**: Returns `{ "sender": WhatsAppSender }`.

#### `PATCH /api/v1/settings/whatsapp/senders/{id}`
- **Auth**: Required
- **Request Body**: `{ "name"?: string, "active"?: boolean }`.
- **Response `200 OK`**: Returns updated `{ "sender": WhatsAppSender }`.

#### `DELETE /api/v1/settings/whatsapp/senders/{id}`
- **Auth**: Required
- **Response `200 OK`**: Returns `{"message": "whatsapp sender deleted successfully"}`.

#### `GET /api/v1/me/preferences`
- **Auth**: Required
- **Response `200 OK`**: Returns `{ "preferences": UserPreferences }`.

#### `PATCH /api/v1/me/preferences`
- **Auth**: Required
- **Request Body**: Partial `UserPreferences`.
- **Response `200 OK`**: Returns updated `{ "preferences": UserPreferences }`.

---

### 5.6 Tax Vault & Accountant Exports

#### `GET /api/v1/tax-profile`
- **Auth**: Required
- **Response `200 OK`**: Returns `{ "profile": TaxProfile }`.

#### `PUT /api/v1/tax-profile`
- **Auth**: Required
- **Request Body**: Full `TaxProfile` object.
- **Response `200 OK`**: Returns updated `{ "profile": TaxProfile }`.

#### `GET /api/v1/tax-vault?year=2026`
- **Auth**: Required
- **Query Params**: `year` (defaults to current year)
- **Calculation Details**:
  - Sourced dynamically from the `tax_rules` table seeded from `tax-rules-2026-nl.json`.
  - Calculates BTW per period (`month`, `quarter`, `year`) with official rubrieken (`1a`, `1b`, `1e`, `2a`, `5a`, `5b`, `balance`). Deadlines default to the last day of the month after the period.
  - If `uses_kor: true`, BTW is disabled and a critical warning triggers when turnover passes €20,000.
  - Generates 10-step income tax estimate for `eenmanszaak` in both `to_date` and `projected` scenarios.
  - Provides monthly set-aside advice, deadlines, warnings, and used tax rule citations.
- **Response `200 OK`**: Returns `TaxVaultOverview`.

#### `GET /api/v1/tax-vault/export-options`
- **Auth**: Required
- **Response `200 OK`**: Returns `{ "formats": ExportFormatOption[] }` (`xlsx`, `csv`, `pdf_summary`, `receipts_zip`, `xaf`).

#### `GET /api/v1/tax-vault/exports?year=2026`
- **Auth**: Required
- **Response `200 OK`**: Returns `{ "exports": TaxExport[] }`.

#### `POST /api/v1/tax-vault/exports`
- **Auth**: Required
- **Request Body**: `CreateTaxExportRequest`.
- **Response `202 Accepted`**: Initiates background export generation (`pending` → `ready`), optionally emails the accountant, and updates export format defaults if `save_as_default: true`.

---

### 5.7 Webhooks & Automation (Phase 5)

#### `GET /api/v1/webhooks/whatsapp`
- **Auth**: Public / Webhook Verification Handshake
- **Query Params**: `hub.mode=subscribe`, `hub.challenge=...`
- **Response `200 OK`**: Returns raw `hub.challenge` string for Meta Cloud API webhook verification.

#### `POST /api/v1/webhooks/whatsapp`
- **Auth**: Public with Sender Verification
- **Request Body**:
  ```json
  {
    "from": "06 1234 5678",
    "to": "+31850012345",
    "message_id": "wamid.HBgLM...",
    "type": "image",
    "caption": "Schroeven en kit bij Bouwmaat",
    "media_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "mime_type": "image/jpeg"
  }
  ```
- **Processing**:
  - Normalizes sender phone to E.164.
  - Verifies caller against registered company senders. Rejects unregistered callers with `403 Forbidden`.
  - Creates an expense with `status: "processing"`, `source: "whatsapp"`, and attaches sender metadata.
  - Increments sender `receipts_count`.
  - Runs background OCR/AI extraction (`DefaultReceiptExtractor`) and advances status to `needs_review` with merchant, total, and VAT breakdown.
- **Response `202 Accepted`**:
  ```json
  {
    "status": "processing",
    "expense_id": "exp_..."
  }
  ```

---

## 💻 6. Frontend Code Examples

### Standard `fetch` Client (`src/lib/api/client.ts`)

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085/api/v1';

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // CRITICAL: sends and receives HttpOnly session cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data as T;
}
```

### Example: Uploading an Expense with Phone Photo

```typescript
import { apiRequest } from './client';
import { Expense } from '@/types/api';

export async function uploadExpensePhoto(file: File, merchantName: string): Promise<Expense> {
  // Convert file to base64 Data URL
  const base64DataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const response = await apiRequest<{ expense: Expense }>('/expenses', {
    method: 'POST',
    body: JSON.stringify({
      merchant_name: merchantName,
      receipt_url: base64DataUrl,
      receipt_content_type: file.type,
      total_amount: 0,
      status: 'approved',
      source: 'upload',
    }),
  });

  return response.expense;
}
```

### Example: Fetching Tax Vault Overview

```typescript
import { apiRequest } from './client';
import { TaxVaultOverview } from '@/types/api';

export async function getTaxVault(year: number = 2026): Promise<TaxVaultOverview> {
  return apiRequest<TaxVaultOverview>(`/tax-vault?year=${year}`, {
    method: 'GET',
  });
}
```

### Example: Downloading Reports (PDF / Excel)

```typescript
import { apiRequest, getApiBaseUrl } from './client';

export type ReportKey = 'profit_loss' | 'vat_summary' | 'invoices' | 'expenses';
export type ReportFormat = 'pdf' | 'xlsx';

export interface ReportOptions {
  reports: { key: ReportKey; formats: ReportFormat[] }[];
  available_years: number[];
}

export async function getReportOptions(): Promise<ReportOptions> {
  return apiRequest<ReportOptions>('/reports/options', { method: 'GET' });
}

export async function downloadReport(
  key: ReportKey,
  params: { format: ReportFormat; from: string; to: string; lang: 'nl' | 'en' }
): Promise<{ blob: Blob; filename: string }> {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${getApiBaseUrl()}/api/v1/reports/${encodeURIComponent(key)}?${query}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || `Download failed: ${res.status}`);
  }

  // Read filename from Content-Disposition header
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename\*=UTF-8''([^;]+)/i) || disposition.match(/filename="?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : `${key}.${params.format}`;

  const blob = await res.blob();
  return { blob, filename };
}
```
