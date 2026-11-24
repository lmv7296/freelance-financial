# FreelanceFin Go Backend: Comprehensive API Documentation

This document describes all architectural modifications, database migrations, and endpoints implemented for the FreelanceFin Go backend. It covers the four core functional areas (Reference Data & Lists, Expenses, Settings & Preferences, Tax Vault) and Phase 5 (WhatsApp Webhook Intake, OCR Pipeline, and Email Dispatching).

---

## 1. Architectural & Domain Rules

### Authentication & Multi-Tenancy
- **Session & Token Support**: All protected endpoints accept either an HTTP-only session cookie (`session_token`) or a bearer token (`Authorization: Bearer <token>`).
- **CORS Credentials**: Configured with `Access-Control-Allow-Credentials: true` and origin reflection matching `CORS_ALLOWED_ORIGINS`.
- **Multi-Tenant Model**: Company-wide resources (expenses, receipts, clients, invoices, settings, tax data) are scoped to `company_id`. User accounts link to a company via `company_id`. User preferences, language, theme, and account credentials belong directly to `user_id`.

### Financial Data & Money
- **Internal Storage**: All monetary amounts are stored in integer cents (`int64` in Go, `BIGINT` in PostgreSQL).
- **External API**: Decimal euros formatted as standard JSON numbers (e.g., `42.10`, `1200.00`). Float arithmetic is strictly prohibited for money math; rounding is performed during cent-to-euro conversion.

### Error Handling & HTTP Statuses
All error responses return a standardized JSON structure:
```json
{
  "error": "Error message explanation"
}
```
Standard status codes used across all handlers:
- `200 OK`: Successful retrieval or synchronous update.
- `201 Created`: Resource successfully created.
- `202 Accepted`: Asynchronous operation initiated (e.g., WhatsApp webhook, tax export generation).
- `204 No Content`: Resource deleted or session invalidated.
- `400 Bad Request`: Invalid payload syntax or malformed parameters.
- `401 Unauthorized`: Not logged in, session expired, or wrong current password.
- `403 Forbidden`: Unregistered/unauthorized sender (e.g., WhatsApp number not linked to company).
- `404 Not Found`: Target entity does not exist within the authenticated company scope.
- `409 Conflict`: Unique constraint violation (e.g., duplicate sender phone number, duplicate email).
- `422 Unprocessable Entity`: Validation failure on domain fields (e.g., invalid IBAN checksum, invalid KvK).

---

## 2. Database Migrations

Six SQL migration files are located in `/migrations/` and have been applied to PostgreSQL:

1. `001_create_companies_and_lists.sql`:
   - Adds `companies` table.
   - Adds `company_lists` table (`merchants`, `categories`, `payment_methods` JSONB).
   - Adds `company_id` column and index on `users`.

2. `002_create_expenses_clients_invoices.sql`:
   - Adds `clients` table (`id`, `company_id`, `name`).
   - Adds `company_invoices` table (`id`, `company_id`, `client_id`, `invoice_number`, `issue_date`, `subtotal_cents`, `vat_rate`, `vat_amount_cents`, `total_cents`).
   - Adds `company_expenses` table (`id`, `company_id`, `status`, `source`, `merchant_name`, `receipt_date`, `total_cents`, line items, and VAT breakdown).

3. `003_create_settings_tables.sql`:
   - Adds `company_settings` (trade name, KvK, btw-id, address, contact, IBAN, logo URL).
   - Adds `invoice_defaults` (payment terms, numbering prefix, next number, padding, default VAT rate).
   - Adds `whatsapp_senders` (sender name, phone in E.164, active flag, receipts count).
   - Adds `user_preferences` (language, theme, notification settings JSONB).

4. `004_create_tax_vault_tables.sql`:
   - Adds `tax_rules` table (exact schema supporting 2026 Belastingdienst rules, piecewise curves, brackets, source URLs, verified dates).
   - Adds `tax_profiles` table (legal form, VAT filing frequency, KOR flag, hours criterion, starters status, accountant contacts, export preferences).
   - Adds `tax_exports` table (export records, generated download URLs, accountant dispatch state).

5. `005_align_users_and_sessions.sql`:
   - Aligns `users` and `sessions` tables with full authentication and session tracking.
   - Adds index on `sessions.token_hash`.

6. `006_onboarding_and_email_verification.sql`:
   - Aligns `users` table for onboarding wizard: relaxes country check, drops NOT NULL on onboarding fields (`full_name`, `phone_number`, `country`, `business_name`, `tax_regime`).
   - Adds `email_verification_tokens` table (`id`, `user_id`, `token_hash`, `expires_at`, `created_at` with unique user index).

7. `007_sync_companies_and_make_name_nullable.sql`:
   - Business data transition: copies existing user business fields to `companies`.
   - Makes `companies.name` nullable and sets placeholder `'Mijn Bedrijf'` to `NULL`.
   - Backend queries fully migrated to read/write company data on `companies` table directly.

8. `008_add_status_due_date_paid_at_to_company_invoices.sql`:
   - Adds `status` (`DRAFT`, `SENT`, `PAID`, `CANCELLED`, default `'SENT'`), `due_date` (NOT NULL, default `CURRENT_DATE`), `paid_at` (`DATE`, nullable), and `currency` (default `'EUR'`) to `company_invoices`.
   - Adds indexes on `due_date` and `status`.

---

## 3. Complete Endpoint Reference

### Summary Table

| Category | Method | Path | Request Body | Response Status & Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/healthz` | None | `200` `{"status":"ok"}` | Basic liveness probe |
| | `GET` | `/readyz` | None | `200` `{"status":"ready"}` | Database readiness probe |
| **Auth & Account** | `POST` | `/api/v1/auth/register` | `{ email, password }` | `201` `{"user": User}` | Registers user, provisions company, sends verification email |
| | `POST` | `/api/v1/auth/login` | `{ email, password }` | `200` `{"user": User, "token": string}` | Logs in and sets `session_token` cookie |
| | `POST` | `/api/v1/auth/logout` | None | `200` `{"message": string}` | Destroys current session token |
| | `GET` | `/api/v1/auth/me` | None | `200` `{"user": User}` | Returns full authenticated user profile |
| | `PATCH` | `/api/v1/me/profile` | `UpdateProfileRequest` | `200` `{"user": User}` | Updates onboarding profile & syncs company tables (422 on validation error) |
| | `POST` | `/api/v1/auth/verify-email` | `{ token }` | `200` `{"user": User}` | Verifies email token (400 on invalid/expired, no auth required) |
| | `POST` | `/api/v1/auth/resend-verification` | None | `200` `{"message": string}` | Resends verification email (rate-limited 1/min, 429) |
| | `PATCH` | `/api/v1/me/email` | `{ new_email, current_password }` | `200` `{"user": User}` | Changes email (validates current password, 409 if taken, resets verification) |
| | `POST` | `/api/v1/auth/change-password` | `{ current_password, new_password }` | `200` `{"message": string}` | Updates password (8–72 chars) and revokes other sessions |
| | `POST` | `/api/v1/auth/logout-all` | None | `200` `{"message": string}` | Revokes all active sessions for user |
| **Reference Data** | `GET` | `/api/v1/config` | None | `200` `AppConfig` | Reference lists, VAT rates, merchants |
| | `GET` | `/api/v1/settings/lists` | None | `200` `{"lists": CompanyLists}` | Company merchant, category, & payment method lists |
| | `PUT` | `/api/v1/settings/lists` | `CompanyLists` | `200` `{"lists": CompanyLists}` | Atomic list replacement with duplicate validation |
| **Expenses** | `GET` | `/api/v1/expenses` | Query: `status`, `search` | `200` `{"expenses": Expense[]}` | Newest-first list of company expenses |
| | `GET` | `/api/v1/expenses/{id}` | None | `200` `{"expense": Expense}` | Single expense details |
| | `POST` | `/api/v1/expenses` | `CreateExpenseRequest` | `201` `{"expense": Expense}` | Create expense (handles base64 receipt uploads) |
| | `PATCH` | `/api/v1/expenses/{id}` | `UpdateExpenseRequest` | `200` `{"expense": Expense}` | Partial update of expense fields / status |
| | `DELETE` | `/api/v1/expenses/{id}` | None | `200` `{"message": string}` | Deletes expense and associated receipt file |
| | `GET` | `/api/v1/receipts/{id}` | None | `200` Image/PDF stream | Direct browser `<img src>` serving (authenticated) |
| | `GET` | `/api/v1/clients` | None | `200` `{"clients": Client[]}` | Available clients for expense linking |
| | `GET` | `/api/v1/invoices` | Query: `client_id` | `200` `{"invoices": Invoice[]}` | Invoices eligible for billable expense linking |
| **Settings** | `GET` | `/api/v1/settings/company` | None | `200` `{"company": CompanySettings}` | Company registration & legal information |
| | `PATCH` | `/api/v1/settings/company` | `CompanySettings` | `200` `{"company": CompanySettings}` | Update company details (validates KvK, btw-id, IBAN) |
| | `POST` | `/api/v1/settings/company/logo` | `multipart/form-data` (`logo`) | `200` `{"logo_url": string}` | Uploads company logo (PNG, JPG, SVG with sanitization) |
| | `DELETE` | `/api/v1/settings/company/logo` | None | `200` `{"message": string}` | Removes company logo |
| | `GET` | `/api/v1/settings/invoice-defaults` | None | `200` `{"invoice_defaults": InvoiceDefaults}` | Next invoice number, prefix, and payment terms |
| | `PATCH` | `/api/v1/settings/invoice-defaults` | `InvoiceDefaults` | `200` `{"invoice_defaults": InvoiceDefaults}` | Update defaults (`next_number` cannot go below existing) |
| | `GET` | `/api/v1/settings/whatsapp` | None | `200` `{"whatsapp": WhatsAppSettings}` | Registered senders and receiving WhatsApp number |
| | `POST` | `/api/v1/settings/whatsapp/senders` | `{ name, phone }` | `201` `{"sender": WhatsAppSender}` | Registers phone sender (E.164 format, 409 on duplicate) |
| | `PATCH` | `/api/v1/settings/whatsapp/senders/{id}` | `{ name?, active? }` | `200` `{"sender": WhatsAppSender}` | Updates sender name or toggle active state |
| | `DELETE` | `/api/v1/settings/whatsapp/senders/{id}` | None | `200` `{"message": string}` | Removes registered WhatsApp sender |
| | `GET` | `/api/v1/me/preferences` | None | `200` `{"preferences": UserPreferences}` | User UI preferences and notifications |
| | `PATCH` | `/api/v1/me/preferences` | `UserPreferences` | `200` `{"preferences": UserPreferences}` | Updates language, theme, and notification preferences |
| **Tax Vault** | `GET` | `/api/v1/tax-profile` | None | `200` `{"profile": TaxProfile}` | Tax profile (legal form, KOR, urencriterium, accountant) |
| | `PUT` | `/api/v1/tax-profile` | `TaxProfile` | `200` `{"profile": TaxProfile}` | Update company tax profile |
| | `GET` | `/api/v1/tax-vault` | Query: `year` (e.g. `2026`) | `200` `TaxVaultOverview` | Full calculation overview: BTW rubrieken, 10-step income tax |
| | `GET` | `/api/v1/tax-vault/export-options` | None | `200` `{"formats": ExportFormatOption[]}` | Formats supported for accountant export |
| | `GET` | `/api/v1/tax-vault/exports` | Query: `year` | `200` `{"exports": TaxExport[]}` | Historical exports generated for the year |
| | `POST` | `/api/v1/tax-vault/exports` | `CreateTaxExportRequest` | `202` `{"export": TaxExport}` | Starts background generation of tax package |
| **Reports** | `GET` | `/api/v1/reports/options` | None | `200` `ReportOptions` | Available reports, supported formats, and active tax years |
| | `GET` | `/api/v1/reports/{key}` | Query: `format`, `from`, `to`, `lang` | `200` File stream (PDF / Excel) | Downloads on-the-fly generated business report |
| **Webhooks** | `GET` | `/api/v1/webhooks/whatsapp` | Query: `hub.mode`, `hub.challenge` | `200` Plaintext challenge string | WhatsApp / Meta webhook verification handshake |
| | `POST` | `/api/v1/webhooks/whatsapp` | `WhatsAppWebhookMessage` | `202` `{"status":"processing", ...}` | Inbound receipt image processing via OCR |

---

## 4. Detailed Endpoint Schemas & Payloads

### Auth, Account & Onboarding

#### Full User Model Representation
Returned across `login`, `register`, `GET /api/v1/auth/me`, `PATCH /api/v1/me/profile`, and `POST /api/v1/auth/verify-email`. Unfilled profile fields are returned as `null` (never omitted):
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

#### `POST /api/v1/auth/register`
- **Authentication**: Public (Rate-limited: 5 attempts/min)
- **Request Body**:
  ```json
  {
    "email": "jan@devriesbouw.nl",
    "password": "SecurePassword123!"
  }
  ```
- **Response `201 Created`**: Returns `{ "user": User }` and triggers background verification email dispatch.

#### `POST /api/v1/auth/login`
- **Authentication**: Public (Rate-limited: 5 attempts/min)
- **Request Body**:
  ```json
  {
    "email": "jan@devriesbouw.nl",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`**: Sets HttpOnly `session_token` cookie and returns:
  ```json
  {
    "token": "sess_tok_...",
    "expires_at": "2026-11-02T10:00:00Z",
    "user": { ... }
  }
  ```

#### `GET /api/v1/auth/me`
- **Authentication**: Required (`session_token` cookie or `Bearer <token>`)
- **Response `200 OK`**: Returns current authenticated full `{ "user": User }`.

#### `PATCH /api/v1/me/profile` (Onboarding Profile Update)
- **Authentication**: Required
- **Request Body** (Updates only the fields provided):
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
- **Validation Rules (422 Unprocessable Entity on failure)**:
  - `full_name`, `business_name`: Non-empty after trimming, max 200 characters.
  - `phone_number`: Normalized to E.164 (e.g. `06 1234 5678` with country `NL` becomes `+31612345678`), rejected if invalid.
  - `country`: Valid ISO 3166-1 alpha-2 code, stored uppercase.
  - `tax_regime`: One of `eenmanszaak`, `vof`, `bv`.
  - `vat_number`: Optional. Empty string or `null` clears it. Normalized to uppercase with spaces and dots stripped. For `NL`: format `NL` + 9 digits + `B` + 2 digits (`NL123456789B01`). For other countries: 2-letter prefix + 2 to 13 alphanumeric chars.
- **Company Synchronization & Multi-tenant Role Check**:
  - Personal fields (`full_name`, `phone_number`) are stored on `users`.
  - Business fields (`business_name` -> `companies.name`, `legal_form`, `vat_number`, `country`, `tax_regime`) are stored directly on `companies` in a single transaction.
  - Role verification: only users with `role = 'owner'` may update company fields. Users with `role = 'member'` receive `403 Forbidden` if attempting to modify company fields (`business_name`, `vat_number`, `tax_regime`, `country`, etc.).
  - When `country` is updated, `companies.tax_regime` is automatically mapped (e.g., `NL` -> `NL_BTW_STANDARD`, `BE` -> `BE_TVA_STANDARD`, `DE` -> `DE_MWST_STANDARD`, `ES` -> `ES_AUTONOMO_GENERAL`).
- **Response `200 OK`**: Returns `{ "user": User }`.
- **Response `403 Forbidden`**: `{ "error": "Only company owners can update company profile details" }` when a member tries to update company fields.

#### `POST /api/v1/auth/verify-email`
- **Authentication**: None (Can be opened on any device or incognito browser)
- **Request Body**:
  ```json
  {
    "token": "32-byte-hex-token-string"
  }
  ```
- **Response `200 OK`**: Sets `is_verified = true`, invalidates single-use token, and returns `{ "user": User }`.
- **Errors**: `400 Bad Request` with `{ "error": "Ongeldige of verlopen verificatielink" }` if token is invalid, expired, or already used. (Never returns 401).

#### `POST /api/v1/auth/resend-verification`
- **Authentication**: Required
- **Request Body**: None
- **Rate Limit**: Max 1 request per minute. Subsequent immediate requests return `429 Too Many Requests`.
- **Response `200 OK`**:
  - If user is already verified: returns `{ "message": "Verificatie-e-mail verzonden" }` immediately without sending.
  - If unverified: generates a fresh cryptographically secure 32-byte token (24h expiry) and dispatches verification email to user's registered address.

#### `PATCH /api/v1/me/email`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "new_email": "jan.nieuw@devriesbouw.nl",
    "current_password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`**: Updates email, resets `is_verified = false`, creates new verification token, and sends verification email. Returns `{ "user": User }`.
- **Errors**: `401 Unauthorized` on wrong password, `409 Conflict` if new email is in use.

#### `POST /api/v1/auth/change-password`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "current_password": "OldPassword123!",
    "new_password": "NewPassword456!"
  }
  ```
- **Response `200 OK`**: Returns `{ "message": "password updated successfully" }` and revokes all other sessions.

#### `POST /api/v1/auth/logout`
- **Authentication**: Public / Authenticated
- **Response `200 OK`**: Revokes current session token and expires session cookie.

#### `POST /api/v1/auth/logout-all`
- **Authentication**: Required
- **Response `200 OK`**: Revokes all active user sessions across all devices.

---

### Phase 1: Reference Data & Lists

#### `GET /api/v1/config`
- **Authentication**: Required (`session_token` or `Bearer <token>`)
- **Query Parameters**: None
- **Response `200 OK`**:
```json
{
  "payment_methods": ["PIN / Betaalpas", "Contant", "iDEAL", "Creditcard", "Overboeking"],
  "vat_rates": [
    { "rate": 21, "label": "21% Hoog (standaard)", "value": "21" },
    { "rate": 9, "label": "9% Laag (verlaagd)", "value": "9" },
    { "rate": 0, "label": "0% Nul / Vrijgesteld", "value": "0" }
  ],
  "categories": [
    "Bouwmaterialen & Onderdelen",
    "Gereedschap & Apparatuur",
    "Brandstof & Vervoer",
    "Kantoor & Administratie",
    "Werkkleding & PBM"
  ],
  "common_merchants": [
    { "name": "Bouwmaat", "category": "Bouwmaterialen & Onderdelen" },
    { "name": "Gamma", "category": "Bouwmaterialen & Onderdelen" },
    { "name": "Toolstation", "category": "Gereedschap & Apparatuur" },
    { "name": "Shell", "category": "Brandstof & Vervoer" }
  ]
}
```

#### `GET /api/v1/settings/lists`
- **Response `200 OK`**:
```json
{
  "lists": {
    "merchants": [
      { "name": "Bouwmaat", "category": "Bouwmaterialen & Onderdelen" }
    ],
    "categories": ["Bouwmaterialen & Onderdelen", "Gereedschap & Apparatuur"],
    "payment_methods": ["PIN / Betaalpas", "Contant"]
  }
}
```

#### `PUT /api/v1/settings/lists`
- **Request Body**:
```json
{
  "merchants": [
    { "name": "Gamma", "category": "Bouwmaterialen & Onderdelen" }
  ],
  "categories": ["Bouwmaterialen & Onderdelen", "Brandstof & Vervoer"],
  "payment_methods": ["PIN / Betaalpas", "Contant", "Creditcard"]
}
```
- **Validation Rules**:
  - Empty names/strings are rejected with `400 Bad Request`.
  - Case-insensitive duplicates within any list return `400 Bad Request`.
  - Operates atomically.
- **Response `200 OK`**: Returns updated `{"lists": CompanyLists}`.

---

### Phase 2: Expenses & Linking

#### `GET /api/v1/expenses`
- **Query Parameters**:
  - `status` (optional): Filter by `processing`, `needs_review`, `approved`, `rejected`.
  - `search` (optional): Case-insensitive match on `merchant_name` or `notes`.
- **Response `200 OK`**:
```json
{
  "expenses": [
    {
      "id": "exp_1730345678",
      "status": "approved",
      "source": "upload",
      "sender_name": null,
      "sender_phone": null,
      "merchant_name": "Bouwmaat Amsterdam",
      "merchant_address": "Kabelweg 22",
      "receipt_date": "2026-10-15",
      "payment_method": "PIN / Betaalpas",
      "category": "Bouwmaterialen & Onderdelen",
      "currency": "EUR",
      "subtotal_amount": 100.00,
      "vat_amount": 21.00,
      "total_amount": 121.00,
      "vat_lines": [
        { "rate": 21.0, "base_amount": 100.00, "vat_amount": 21.00 }
      ],
      "line_items": [
        {
          "description": "Schroeven 4x40 RVS",
          "quantity": 2.0,
          "unit_price": 50.00,
          "total_price": 100.00,
          "vat_rate": 21.0
        }
      ],
      "receipt_url": "/api/v1/receipts/rec_89123891",
      "receipt_content_type": "image/jpeg",
      "extraction_confidence": 0.96,
      "client_id": "cli_991823",
      "client_name": "Bakkerij Jansen",
      "invoice_id": "inv_12345",
      "invoice_number": "FACT-2026-0042",
      "notes": "Schroeven voor toonbank reparatie",
      "rejection_reason": null,
      "created_at": "2026-10-15T14:30:00Z",
      "updated_at": "2026-10-15T14:30:00Z"
    }
  ]
}
```

#### `POST /api/v1/expenses`
- **Request Body**:
```json
{
  "merchant_name": "Praxis Haarlem",
  "receipt_date": "2026-10-20",
  "payment_method": "PIN / Betaalpas",
  "category": "Gereedschap & Apparatuur",
  "currency": "EUR",
  "subtotal_amount": 50.00,
  "vat_amount": 10.50,
  "total_amount": 60.50,
  "vat_lines": [
    { "rate": 21.0, "base_amount": 50.00, "vat_amount": 10.50 }
  ],
  "receipt_url": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "receipt_content_type": "image/jpeg",
  "client_id": "cli_991823",
  "status": "approved",
  "source": "manual",
  "notes": "Decoupeerzaagblad set"
}
```
- **Server Behavior**:
  - Body limit allows up to 15MB for high-resolution camera photos.
  - Base64 data URLs (`data:image/jpeg;base64,...`) are validated, decoded, persisted to secure storage, and substituted with permanent server URLs (`/api/v1/receipts/{fileId}`). Allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `application/pdf`.
  - Derives `client_name` and `invoice_number` from the database using `client_id` and `invoice_id` (sent convenience labels are not trusted).
- **Response `201 Created`**: Returns `{"expense": Expense}`.

#### `PATCH /api/v1/expenses/{id}`
- **Request Body** (accepts partial fields):
```json
{
  "status": "approved",
  "merchant_name": "Praxis Haarlem Centrum",
  "category": "Gereedschap & Apparatuur",
  "total_amount": 62.00
}
```
- **Validation**: `status` must be one of `processing`, `needs_review`, `approved`, or `rejected`.
- **Response `200 OK`**: Returns updated `{"expense": Expense}`.

#### `DELETE /api/v1/expenses/{id}`
- **Response `200 OK`**:
```json
{
  "message": "Expense deleted successfully"
}
```

#### `GET /api/v1/receipts/{id}`
- **Headers**: Session cookie or `Authorization: Bearer <token>`.
- **Response**: Binary stream of the original image/PDF (`Content-Type: image/jpeg`, etc.). Enforces strict company tenant isolation (receipts belonging to another company return `404 Not Found`).

#### `GET /api/v1/clients`
- **Response `200 OK`**:
```json
{
  "clients": [
    { "id": "cli_1", "name": "Bouwbedrijf De Vries BV" },
    { "id": "cli_2", "name": "Bakkerij Jansen" }
  ]
}
```

#### `GET /api/v1/invoices`
- **Query Parameters**: `client_id` (optional).
- **Response `200 OK`**:
```json
{
  "invoices": [
    {
      "id": "inv_101",
      "invoice_number": "FACT-2026-0012",
      "client_id": "cli_1"
    }
  ]
}
```

---

### Phase 3: Settings & Preferences

#### `GET /api/v1/settings/company`
- **Response `200 OK`**:
```json
{
  "company": {
    "company_name": "Timmerman Jan",
    "trade_name": "Jan de Vries Bouw & Montage",
    "kvk_number": "12345678",
    "vat_number": "NL123456789B01",
    "street": "Prinsengracht 123",
    "postal_code": "1015 DT",
    "city": "Amsterdam",
    "country": "NL",
    "email": "jan@devriesbouw.nl",
    "phone": "+31612345678",
    "website": "https://devriesbouw.nl",
    "iban": "NL20INGB0001234567",
    "logo_url": "/api/v1/settings/company/logo",
    "updated_at": "2026-10-31T00:00:00Z"
  }
}
```

#### `PATCH /api/v1/settings/company`
- **Request Body**: Accepts partial updates of `CompanySettings`.
- **Validation Rules**:
  - `kvk_number`: 8 numeric digits.
  - `vat_number`: `NL` + 9 digits + `B` + 2 digits (e.g. `NL123456789B01`).
  - `postal_code`: 4 digits (starting with 1-9) + 2 letters (normalized to `1234 AB`).
  - `iban`: ISO 13616 Mod-97 checksum validation.
- **Response `200 OK`**: Updated `{"company": CompanySettings}`.

#### `POST /api/v1/settings/company/logo`
- **Content-Type**: `multipart/form-data` with field `logo`.
- **Constraints**: Formats allowed: PNG, JPG/JPEG, SVG. Maximum size: 2MB. SVG uploads are sanitised against `<script>`, `javascript:`, and malicious embedded event attributes (`onload`, `onerror`).
- **Response `200 OK`**: `{"logo_url": "/api/v1/settings/company/logo"}`.

#### `GET /api/v1/settings/invoice-defaults`
- **Response `200 OK`**:
```json
{
  "invoice_defaults": {
    "payment_term_days": 14,
    "number_prefix": "FACT-2026-",
    "next_number": 15,
    "number_padding": 4,
    "default_vat_rate": 21,
    "default_payment_method": "PIN / Betaalpas",
    "footer_text": "Graag betalen binnen 14 dagen o.v.v. het factuurnummer.",
    "updated_at": "2026-10-31T00:00:00Z"
  }
}
```

#### `PATCH /api/v1/settings/invoice-defaults`
- **Validation**: `next_number` can never be updated to a number lower than an existing invoice issued by the company.
- **Response `200 OK`**: Returns updated `{"invoice_defaults": InvoiceDefaults}`.

#### `GET /api/v1/settings/whatsapp`
- **Response `200 OK`**:
```json
{
  "whatsapp": {
    "receivingNumber": "+31850012345",
    "senders": [
      {
        "id": "snd_4812",
        "name": "Jan de Vries",
        "phone": "+31612345678",
        "active": true,
        "receipts_count": 18,
        "created_at": "2026-10-01T12:00:00Z"
      }
    ]
  }
}
```

#### `POST /api/v1/settings/whatsapp/senders`
- **Request Body**:
```json
{
  "name": "Klaas Timmerman",
  "phone": "06 8765 4321"
}
```
- **Validation**: Normalizes phone to international E.164 (`+31687654321`). Returns `409 Conflict` if the phone number is already registered under this company.
- **Response `201 Created`**: Returns `{"sender": WhatsAppSender}`.

#### `PATCH /api/v1/settings/whatsapp/senders/{id}`
- **Request Body**:
```json
{
  "name": "Klaas Timmerman (ZZP)",
  "active": false
}
```
- **Response `200 OK`**: Returns updated `{"sender": WhatsAppSender}`.

#### `DELETE /api/v1/settings/whatsapp/senders/{id}`
- **Response `200 OK`**: `{"message": "WhatsApp sender deleted successfully"}`.

#### `GET /api/v1/me/preferences`
- **Response `200 OK`**:
```json
{
  "preferences": {
    "language": "nl",
    "theme": "system",
    "notifications": {
      "vat_deadline_reminder": true,
      "vat_deadline_days_before": 7,
      "receipts_to_review": "daily",
      "overdue_invoices": true,
      "income_tax_deadline_reminder": true
    },
    "updated_at": "2026-10-31T00:00:00Z"
  }
}
```

#### `PATCH /api/v1/me/preferences`
- **Request Body**:
```json
{
  "language": "en",
  "theme": "dark",
  "notifications": {
    "receipts_to_review": "instant"
  }
}
```
- **Response `200 OK`**: Returns updated `{"preferences": UserPreferences}`.

#### `PATCH /api/v1/me/email`
- **Request Body**:
```json
{
  "new_email": "jan.nieuwebouw@gmail.com",
  "current_password": "supersecurepassword123"
}
```
- **Response `200 OK`**: `{"user": User}`.
- **Errors**: `401 Unauthorized` on wrong password; `409 Conflict` if `new_email` is taken.

#### `POST /api/v1/auth/change-password`
- **Request Body**:
```json
{
  "current_password": "supersecurepassword123",
  "new_password": "newsuperpassword456!"
}
```
- **Validation**: `new_password` must be between 8 and 72 characters.
- **Side Effect**: Invalidates all other active sessions for the user.
- **Response `200 OK`**: `{"message": "Password updated successfully"}`.

#### `POST /api/v1/auth/logout-all`
- **Request Body**: None.
- **Side Effect**: Revokes all sessions in database/memory and expires the `session_token` cookie.
- **Response `200 OK`**: `{"message": "Logged out from all devices"}`.

---

### Phase 4: Tax Vault

#### `GET /api/v1/tax-profile`
- **Response `200 OK`**:
```json
{
  "profile": {
    "legal_form": "eenmanszaak",
    "vat_filing_frequency": "quarter",
    "uses_kor": false,
    "meets_hours_criterion": true,
    "is_starter": false,
    "reached_aow_age": false,
    "other_box1_income": 0.00,
    "provisional_assessment_monthly": 150.00,
    "accountant_name": "Boekhoudkantoor De Vries",
    "accountant_email": "info@devriesaccountancy.nl",
    "default_export_formats": ["xlsx", "receipts_zip"],
    "updated_at": "2026-10-31T00:00:00Z"
  }
}
```

#### `PUT /api/v1/tax-profile`
- **Request Body**: Full `TaxProfile` object.
- **Response `200 OK`**: Returns updated `{"profile": TaxProfile}`.

#### `GET /api/v1/tax-vault?year=2026`
- **Query Parameters**: `year` (integer, defaults to current calendar year).
- **Tax Calculation Engine Behavior**:
  - Dynamically evaluates rules from `tax_rules` matching `tax_year: 2026`, `legal_form: "eenmanszaak"`, and conditions matching profile flags (`reached_aow_age`, `meets_hours_criterion`, `is_starter`).
  - Executes 10-step income tax calculation:
    1. **Winst** = omzet excl. BTW − approved expenses excl. BTW.
    2. **Ondernemersaftrek** = Zelfstandigenaftrek (€1.200) + Startersaftrek (€2.123). Capped at winst unless starter.
    3. **Mkb-winstvrijstelling** = 12.70% × (winst − ondernemersaftrek).
    4. **Belastbare winst** = winst − aftrek − mkb-vrijstelling.
    5. **Belastbaar inkomen box 1** = Belastbare winst + other Box 1 income.
    6. **Bruto inkomstenbelasting** via 2026 brackets (35.75%, 37.56%, 49.50%).
    7. **Aftrekbeperking** = Top bracket correction capped at 37.56%.
    8. **Heffingskortingen** = Algemene heffingskorting (on verzamelinkomen) + Arbeidskorting (on arbeidsinkomen).
    9. **Zvw-bijdrage** = 4.85% × bijdrage-inkomen (max €79.409).
    10. **Still to pay** = Net IB + Zvw − provisional assessment paid.
  - Generates both `to_date` and full-year `projected` scenarios.
  - Derives official BTW rubrieken (`1a`, `1b`, `1e`, `2a`, `5a`, `5b`, `balance`) for all periods (`month`, `quarter`, or `year`).
  - Sets `enabled: false` on VAT if `uses_kor: true`. Generates `kor_threshold_exceeded` critical warning if turnover passes €20.000.
- **Response `200 OK`**:
```json
{
  "tax_year": 2026,
  "available_years": [2026],
  "legal_form": "eenmanszaak",
  "generated_at": "2026-10-31T00:30:00Z",
  "profile_complete": true,
  "totals": {
    "revenue_excl_vat": 50000.00,
    "expenses_excl_vat": 15000.00,
    "profit": 35000.00,
    "unreviewed_expenses_count": 2
  },
  "vat": {
    "enabled": true,
    "periods": [
      {
        "key": "2026-Q1",
        "label": "1e kwartaal 2026",
        "start_date": "2026-01-01",
        "end_date": "2026-03-31",
        "deadline": "2026-04-30",
        "status": "to_file",
        "is_estimate": false,
        "vat_due": 2625.00,
        "input_vat": 787.50,
        "balance": 1837.50,
        "rubrieken": [
          { "code": "1a", "label": "Leveringen/diensten belast met 21%", "turnover": 12500.00, "vat": 2625.00 },
          { "code": "5a", "label": "Verschuldigde omzetbelasting", "turnover": null, "vat": 2625.00 },
          { "code": "5b", "label": "Voorbelasting", "turnover": null, "vat": 787.50 }
        ]
      }
    ]
  },
  "income_tax": {
    "status": "available",
    "kind": "inkomstenbelasting",
    "label": "Inkomstenbelasting & Zvw (ZZP / eenmanszaak)",
    "projection_method": "Jaarprojectie op basis van gemiddelde winst per verstreken maand (winst ÷ maanden × 12)",
    "to_date": {
      "basis_label": "Werkelijke cijfers t/m oktober",
      "profit": 35000.00,
      "taxable_income": 29505.74,
      "total_tax": 5824.12,
      "provisional_assessment_paid": 1500.00,
      "still_to_pay": 4324.12,
      "effective_rate": 0.1664,
      "components": [
        { "key": "ib", "label": "Inkomstenbelasting box 1", "amount": 4393.09 },
        { "key": "zvw", "label": "Bijdrage Zorgverzekeringswet (Zvw)", "amount": 1431.03 }
      ],
      "steps": [
        { "key": "winst", "label": "Winst uit onderneming (omzet - kosten)", "amount": 35000.00, "kind": "income", "rule_key": null, "note": null },
        { "key": "ondernemersaftrek", "label": "Ondernemersaftrek", "amount": 1200.00, "kind": "deduction", "rule_key": "ib.zelfstandigenaftrek", "note": null },
        { "key": "mkb_winstvrijstelling", "label": "Mkb-winstvrijstelling", "amount": 4294.26, "kind": "deduction", "rule_key": "ib.mkb_winstvrijstelling", "note": null },
        { "key": "belastbare_winst", "label": "Belastbare winst uit onderneming", "amount": 29505.74, "kind": "subtotal", "rule_key": null, "note": null },
        { "key": "belastbaar_inkomen_box1", "label": "Belastbaar inkomen uit werk en woning (box 1)", "amount": 29505.74, "kind": "subtotal", "rule_key": null, "note": null },
        { "key": "inkomstenbelasting_box1_bruto", "label": "Inkomstenbelasting box 1 (bruto)", "amount": 10548.30, "kind": "tax", "rule_key": "ib.box1.brackets", "note": null },
        { "key": "aftrekbeperking", "label": "Correctie aftrekbeperking", "amount": 0.00, "kind": "tax", "rule_key": "ib.deduction_rate_cap", "note": null },
        { "key": "heffingskortingen", "label": "Heffingskortingen (algemene heffingskorting & arbeidskorting)", "amount": 6155.21, "kind": "credit", "rule_key": "ib.algemene_heffingskorting", "note": null },
        { "key": "inkomstenbelasting_netto", "label": "Inkomstenbelasting (te betalen)", "amount": 4393.09, "kind": "subtotal", "rule_key": null, "note": null },
        { "key": "zvw_bijdrage", "label": "Inkomensafhankelijke bijdrage Zvw", "amount": 1431.03, "kind": "tax", "rule_key": "zvw.rate_entrepreneur", "note": null },
        { "key": "totaal_te_betalen", "label": "Totaal inkomstenheffingen", "amount": 5824.12, "kind": "total", "rule_key": null, "note": null }
      ]
    },
    "projected": {
      "basis_label": "Verwacht resultaat heel kalenderjaar",
      "profit": 42000.00,
      "taxable_income": 35618.88,
      "total_tax": 7680.50,
      "provisional_assessment_paid": 1800.00,
      "still_to_pay": 5880.50,
      "effective_rate": 0.1829,
      "components": [
        { "key": "ib", "label": "Inkomstenbelasting box 1", "amount": 5953.00 },
        { "key": "zvw", "label": "Bijdrage Zorgverzekeringswet (Zvw)", "amount": 1727.50 }
      ],
      "steps": []
    }
  },
  "set_aside": {
    "monthly_amount": 2940.25,
    "months_remaining": 2,
    "components": [
      { "key": "ib", "label": "Inkomstenbelasting box 1", "amount": 5953.00 },
      { "key": "zvw", "label": "Bijdrage Zorgverzekeringswet (Zvw)", "amount": 1727.50 }
    ],
    "explanation": "Advies om maandelijks € 2940.25 opzij te zetten gedurende de resterende 2 maanden van 2026."
  },
  "deadlines": [
    {
      "key": "vat-2026-Q1",
      "date": "2026-04-30",
      "type": "vat_return",
      "label": "Btw-aangifte & betaling 1e kwartaal 2026",
      "description": null,
      "status": "overdue",
      "amount": 1837.50,
      "source_url": null
    },
    {
      "key": "ib-2026",
      "date": "2027-05-01",
      "type": "income_tax_return",
      "label": "Aangifte inkomstenbelasting 2026",
      "description": null,
      "status": "upcoming",
      "amount": null,
      "source_url": null
    }
  ],
  "warnings": [
    {
      "code": "unreviewed_expenses",
      "severity": "warning",
      "message": "Er zijn nog 2 uitgaven die beoordeeld moeten worden. Deze zijn niet meegenomen in de berekening."
    }
  ],
  "rules_used": [
    {
      "key": "ib.mkb_winstvrijstelling",
      "label": "Mkb-winstvrijstelling (over winst na ondernemersaftrek)",
      "value_type": "percentage",
      "value": 0.127,
      "display_value": "12.70%",
      "tax_year": 2026,
      "source_url": "https://www.belastingdienst.nl/...",
      "verified_at": "2026-10-30"
    }
  ]
}
```

#### `GET /api/v1/tax-vault/export-options`
- **Response `200 OK`**:
```json
{
  "formats": [
    { "key": "xlsx", "label": "Excel-werkmap (.xlsx)", "description": "Volledig overzicht van omzet, kosten en btw per kwartaal" },
    { "key": "csv", "label": "CSV-bestanden (.csv)", "description": "Kommagescheiden export voor import in boekhoudpakketten" },
    { "key": "pdf_summary", "label": "PDF Samenvatting (.pdf)", "description": "Overzichtelijk rapport voor de belastingaangifte" },
    { "key": "receipts_zip", "label": "Bonnenarchief (.zip)", "description": "Alle gekoppelde bonnetjes en facturen in één ZIP-bestand" },
    { "key": "xaf", "label": "Auditfile Financieel (.xaf)", "description": "Standaard XML-formaat voor de Belastingdienst en accountants" }
  ]
}
```

#### `GET /api/v1/tax-vault/exports`
- **Query Parameters**: `year` (integer, e.g. `2026`).
- **Response `200 OK`**:
```json
{
  "exports": [
    {
      "id": "exp_1730349999",
      "tax_year": 2026,
      "period_key": "year",
      "period_label": "Heel kalenderjaar 2026",
      "formats": ["xlsx", "receipts_zip"],
      "status": "ready",
      "download_url": "/api/v1/tax-vault/exports/exp_1730349999/download",
      "sent_to": "info@devriesaccountancy.nl",
      "error": null,
      "created_at": "2026-10-31T01:00:00Z"
    }
  ]
}
```

#### `POST /api/v1/tax-vault/exports`
- **Request Body**:
```json
{
  "tax_year": 2026,
  "period_key": "year",
  "formats": ["xlsx", "receipts_zip"],
  "send_to_accountant": true,
  "note": "Boekhouding 2026 compleet t/m Q3",
  "save_as_default": true
}
```
- **Response `202 Accepted`**:
```json
{
  "export": {
    "id": "exp_1730349999",
    "tax_year": 2026,
    "period_key": "year",
    "period_label": "Heel kalenderjaar 2026",
    "formats": ["xlsx", "receipts_zip"],
    "status": "pending",
    "download_url": null,
    "sent_to": "info@devriesaccountancy.nl",
    "error": null,
    "created_at": "2026-10-31T01:00:00Z"
  }
}
```

---

### Phase 5: WhatsApp Webhook & OCR Intake

#### `GET /api/v1/webhooks/whatsapp`
- **Query Parameters**:
  - `hub.mode`: `"subscribe"`
  - `hub.challenge`: Random challenge token from provider
- **Response `200 OK`**: Returns the raw `hub.challenge` string in the HTTP body (Meta Cloud API verification).

#### `POST /api/v1/webhooks/whatsapp`
- **Authentication**: Unauthenticated webhook endpoint with sender phone validation against company senders.
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
- **Processing Flow**:
  1. Phone number is normalized using E.164 (`+31612345678`).
  2. Sender registry is queried. If the phone is not registered or `active == false`, rejects immediately with **`403 Forbidden`** (`"Sender not registered for this business"`).
  3. Increments the sender's `receipts_count`.
  4. Creates an initial expense record with `status: "processing"`, `source: "whatsapp"`, and the uploaded photo.
  5. Returns HTTP **`202 Accepted`** with the initial expense ID.
  6. Launches background asynchronous optical analysis (`DefaultReceiptExtractor`).
  7. On completion, the expense is updated to `status: "needs_review"` with parsed merchant name, total, subtotal, VAT lines, and receipt date.
- **Response `202 Accepted`**:
```json
{
  "status": "processing",
  "expense_id": "exp_1730351234"
}
```
- **Error Responses**:
  - `400 Bad Request`: Malformed JSON webhook payload.
  - `403 Forbidden`: Sender phone number not registered under any company.
  - `500 Internal Server Error`: Persistence failure creating receipt.

---

### Reports API

The backend generates downloadable financial reports on-the-fly directly within the HTTP request. Nothing is persisted on the server.

#### `GET /api/v1/reports/options`
- **Authentication**: Required (`session_token` cookie or `Authorization: Bearer <token>`).
- **Description**: Returns all supported report keys, the formats each supports, and the list of available tax years containing invoices or expenses (newest first, always includes current year).
- **Response `200 OK`**:
```json
{
  "reports": [
    { "key": "profit_loss", "formats": ["pdf", "xlsx"] },
    { "key": "vat_summary", "formats": ["pdf", "xlsx"] },
    { "key": "invoices", "formats": ["pdf", "xlsx"] },
    { "key": "expenses", "formats": ["pdf", "xlsx"] }
  ],
  "available_years": [2026, 2025]
}
```
*Note: Slices are guaranteed to be `[]`, never `null`.*

#### `GET /api/v1/reports/{key}`
- **Authentication**: Required (`session_token` cookie or `Authorization: Bearer <token>`).
- **Path Parameters**:
  - `key`: One of `profit_loss`, `vat_summary`, `invoices`, `expenses`.
- **Query Parameters**:
  - `format`: `pdf` or `xlsx`.
  - `from`: Start date `YYYY-MM-DD` (inclusive).
  - `to`: End date `YYYY-MM-DD` (inclusive). Must be on or after `from`.
  - `lang`: Language of labels, headings, and file names: `nl` (default) or `en`.
- **Validation Rules**:
  - `404 Not Found`: Unknown report key.
  - `422 Unprocessable Entity`: Invalid date format, `from > to`, unsupported format or language, or custom non-whole period for `vat_summary` (must be whole month, quarter, or year).
- **Response `200 OK`**:
  - Returns binary file stream.
  - Headers:
    - `Content-Type`: `application/pdf` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
    - `Content-Disposition`: `attachment; filename="<name>"; filename*=UTF-8''<name>`
    - `Access-Control-Expose-Headers`: `Content-Disposition` (enables cross-origin frontend to read file name)
- **File Name Conventions**:
  - Quarter: `winst-en-verlies_2026-Q3.pdf` / `profit-and-loss_2026-Q3.xlsx`
  - Month: `uitgaven-per-categorie_2026-07.pdf`
  - Year: `btw-overzicht_2026.xlsx`
  - Custom range: `facturen-en-openstaande-posten_2026-07-01_2026-08-15.pdf`

