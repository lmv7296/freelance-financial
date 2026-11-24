You are working on the **Go backend** of FreelanceFin, a bookkeeping app for Dutch tradespeople and market sellers (eenmanszaak / zzp). The Next.js frontend has already been built for four features, but the backend endpoints they call don't exist yet. Your job is to implement them.

## Before you write any code

1. **Read the existing backend first** and follow its conventions exactly: router, handler structure, middleware, database layer, migrations, config, error handling, tests, naming. Don't introduce a new framework, ORM or folder layout.
2. **Read the attached contract files.** They are the source of truth for request and response shapes. Field names are `snake_case` and must match exactly:
   - `tax-vault-backend.md`: Tax Vault endpoints, the `tax_rules` table, calculation order
   - `tax-rules-2026-nl.json`: verified 2026 Dutch tax rules (seed data)
   - `settings-backend.md`: Settings endpoints and validation
   - `api.d.ts`: the `Expense` types (bottom of the file)
   - `taxVault.d.ts` and `settings.d.ts`: response types
3. **Give me a short plan** (migrations, endpoints, order of work) and **ask me questions** where something is unclear, before implementing. Don't guess.

## Rules that apply everywhere

- **Auth:** every new endpoint requires a logged-in user. Reuse the existing auth middleware: it accepts the HttpOnly session cookie *and* `Authorization: Bearer <token>`. CORS must allow credentials from the frontend origin (the frontend uses `credentials: "include"`).
- **Errors:** return JSON `{ "error": "message" }`. The frontend relies on these status codes: `401` not logged in / wrong current password, `404` not found, `409` conflict (duplicates), `422` or `400` validation errors.
- **Company vs user:** company-wide data (lists, company details, invoice defaults, WhatsApp senders, expenses, tax data) belongs to the user's **company**. Today one user = one company, but 1–2 users per company must be possible later, so model a company/organisation and link users to it now. Language, theme, notifications and account data belong to the **user**.
- **Money:** store amounts as integer cents (or a decimal type) in the DB; the API sends and receives decimal euros as JSON numbers (e.g. `42.10`). Never use float maths for money.
- **Dates:** `YYYY-MM-DD` for dates, RFC 3339 for timestamps.
- **No made-up tax figures:** every tax rate, threshold and deadline comes from the `tax_rules` table, seeded from `tax-rules-2026-nl.json`. No hardcoded fallbacks. If a rule is missing for a year, return `income_tax.status = "unavailable"` with a warning instead of guessing.
- Write tests for the calculations and validation (at least: tax calculation, BTW per period, IBAN/KvK/btw-id validation, list replacement).

## What to build, in this order

### Phase 1: Reference data and lists (unblocks the expense form)

- `GET /api/v1/config` returns:
  ```json
  {
    "payment_methods": ["PIN / Betaalpas", "Contant"],
    "vat_rates": [{ "rate": 21, "label": "21% Hoog (standaard)", "value": "21" }],
    "categories": ["Bouwmaterialen & Onderdelen"],
    "common_merchants": [{ "name": "Gamma", "category": "Bouwmaterialen & Onderdelen" }]
  }
  ```
  `payment_methods`, `categories` and `common_merchants` must come from the **same company lists** that `GET/PUT /api/v1/settings/lists` manages (`common_merchants` = `lists.merchants`, same order). `vat_rates` come from the tax rules (BTW rates).
- `GET /api/v1/settings/lists` and `PUT /api/v1/settings/lists` (replaces all three lists in one transaction; reject empty or case-insensitive duplicate names). Give a new company sensible default lists.

### Phase 2: Expenses

- `GET /api/v1/expenses` returns `{ "expenses": Expense[] }`, newest first.
- `GET /api/v1/expenses/:id` returns `{ "expense": Expense }`.
- `POST /api/v1/expenses` (manual entry from "Nieuwe uitgave toevoegen") returns `{ "expense": Expense }`. The form sends the full Expense shape; note:
  - `receipt_url` may be a **base64 `data:` URL** (`data:image/jpeg;base64,...`) or empty. Decode it, validate type (JPEG/PNG/WebP/HEIC/PDF) and size, store the file, and replace `receipt_url` with a real URL. Make sure the request body limit allows phone photos (several MB).
  - `client_name` and `invoice_number` are sent for convenience; the server should derive them from `client_id` / `invoice_id` and not trust the sent values.
  - `status` is usually `approved`, `source` is `upload` or `manual`.
- `PATCH /api/v1/expenses/:id` takes only changed fields and returns `{ "expense": Expense }`. Allowed statuses: `processing`, `needs_review`, `approved`, `rejected`.
- `DELETE /api/v1/expenses/:id`.
- **Receipt files:** `receipt_url` must load directly in the browser (`<img src>`, also via the cookie, or use short-lived signed URLs). Only the owning company may access them.
- `GET /api/v1/clients` returns `{ "clients": [{ "id", "name" }] }` and `GET /api/v1/invoices?client_id=` returns `{ "invoices": [{ "id", "invoice_number", "client_id" }] }`, used to link an expense. If clients and invoices don't exist in the backend yet, tell me before building them.

### Phase 3: Settings

Follow `settings-backend.md` and `settings.d.ts`:

- Company details: `GET/PATCH /api/v1/settings/company`, logo upload via `POST /api/v1/settings/company/logo` (multipart field `logo`, PNG/JPG/SVG, max 2 MB; sanitise SVGs or convert them) and `DELETE`. Validate KvK (8 digits), btw-id (`NL` + 9 digits + `B` + 2 digits), Dutch postcode, IBAN (mod-97).
- Invoice defaults: `GET/PATCH /api/v1/settings/invoice-defaults`. `next_number` may never go below an existing invoice number.
- WhatsApp senders: `GET /api/v1/settings/whatsapp`, `POST /api/v1/settings/whatsapp/senders`, and `PATCH/DELETE /api/v1/settings/whatsapp/senders/:id`. Normalise phones to E.164 (`06 1234 5678` → `+31612345678`); duplicates return `409`.
- User preferences: `GET/PATCH /api/v1/me/preferences` (`language`: `nl` or `en`, `theme`: `system`, `light` or `dark`, `notifications` object).
- Account:
  - `PATCH /api/v1/me/email` (`new_email`, `current_password`; `401` for a wrong password, `409` if the email is taken)
  - `POST /api/v1/auth/change-password` (`current_password`, `new_password` 8–72 chars, matching the existing registration rules; revoke the user's *other* sessions afterwards)
  - `POST /api/v1/auth/logout-all` (revoke all sessions, expire the cookie)

### Phase 4: Tax Vault

Follow `tax-vault-backend.md` exactly. Summary:

- A `tax_rules` table (with required `source_url` and `verified_at`), seeded from `tax-rules-2026-nl.json` through a migration or seed command. Rules are selected by `tax_year` + `legal_form` + `key` + matching `conditions` against the user's tax profile.
- `GET/PUT /api/v1/tax-profile`.
- `GET /api/v1/tax-vault?year=` returns `TaxVaultOverview`:
  - BTW per period (month, quarter or year from the profile) with the official rubrieken. 5a is the BTW on invoices, 5b is the BTW on **approved** expenses. The deadline is the last day of the month after the period.
  - The income tax estimate as `steps[]` (each with `rule_key`), in the documented order, as two scenarios: `to_date` and `projected`, with `projection_method` explained.
  - Set-aside advice, deadlines, `warnings[]` and `rules_used[]` (with `display_value`, e.g. `"12,70%"`, `"€ 1.200"`).
  - Only `approved` expenses count; add a warning with the number of `needs_review` expenses.
- `GET /api/v1/tax-vault/export-options` lists the formats the backend can generate, e.g. `xlsx`, `csv`, `pdf_summary`, `receipts_zip`, `xaf`.
- `GET /api/v1/tax-vault/exports?year=` and `POST /api/v1/tax-vault/exports`: generate in the background (`pending` → `ready`/`failed`), optionally email to the accountant, and save `default_export_formats` when `save_as_default` is true. Start with `xlsx`/`csv` and `receipts_zip`; ask me before building XAF or PDF.
- ⚠️ The doc flags two points that are **not confirmed**: the income definition for an ondernemer's *arbeidsinkomen* (arbeidskorting) and *bijdrage-inkomen Zvw*. Implement them behind a clearly named function with a `TODO: confirm with accountant` comment, and tell me what you chose.
- Design for a BV later: keep `legal_form` on the profile and the calculation behind an interface per legal form. Only implement `eenmanszaak` now.

### Phase 5: ask me first

WhatsApp receipt intake (webhook from the WhatsApp Business API, OCR or AI extraction of the receipt, creating expenses with status `processing` → `needs_review`) and the notification emails need decisions about providers and costs. **Don't build these yet. Ask me** which WhatsApp provider, OCR/AI service and email service to use.

## When you're done with each phase

Tell me which endpoints work, which migrations to run, how to seed the tax rules, and anything you couldn't do or had to assume.
