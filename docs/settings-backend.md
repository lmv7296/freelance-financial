# Settings: backend contract

The Settings page (`/settings`) edits **company-wide** settings (shared by everyone in the
company) and **personal** settings (per user). Response types:
[`src/types/settings.d.ts`](../src/types/settings.d.ts).

## Company-wide

| Method | Path | Body / returns |
| --- | --- | --- |
| GET / PATCH | `/api/v1/settings/company` | `{ company: CompanySettings }` |
| POST | `/api/v1/settings/company/logo` | multipart field `logo` (PNG, JPG or SVG) → `{ company }` |
| DELETE | `/api/v1/settings/company/logo` | → `{ company }` |
| GET / PATCH | `/api/v1/settings/invoice-defaults` | `{ invoice_defaults: InvoiceDefaults }` |
| GET / PUT | `/api/v1/settings/lists` | `{ lists: CompanyLists }` (PUT replaces all three lists) |
| GET | `/api/v1/settings/whatsapp` | `WhatsAppSettings` |
| POST | `/api/v1/settings/whatsapp/senders` | `{ name, phone }` → `{ sender }` |
| PATCH / DELETE | `/api/v1/settings/whatsapp/senders/:id` | `{ name?, active? }` → `{ sender }` |

### Lists and `/api/v1/config`

`/api/v1/config` (read by `src/lib/api/config.js`, used in "Nieuwe uitgave toevoegen") must
return the **same** lists that `/api/v1/settings/lists` saves:

- `common_merchants` = `lists.merchants` (same order: this is the "Snelle selectie")
- `categories` = `lists.categories`
- `payment_methods` = `lists.payment_methods`

After saving, the frontend calls `configApi.fetchConfig()` so the new lists show up right away.
Renaming or removing a category doesn't change existing expenses; that's up to the backend.

### WhatsApp senders

Only messages from an **active** sender's number become expenses. Messages from unknown
numbers should be ignored (or kept for review), never booked automatically. Normalise phone
numbers to E.164 (`06 1234 5678` → `+31612345678`) and reject duplicates with `409`.

### Validation (also checked in the frontend)

- `kvk_number`: 8 digits
- `vat_number` (btw-id): `NL` + 9 digits + `B` + 2 digits, e.g. `NL123456789B01`
- `iban`: ISO 13616 checksum (mod 97)
- `postal_code` (NL): 4 digits + 2 letters
- `payment_term_days`: 1 to 365; `next_number`: ≥ 1, never lower than an existing invoice number

## Personal

| Method | Path | Body / returns |
| --- | --- | --- |
| GET / PATCH | `/api/v1/me/preferences` | `{ preferences: UserPreferences }` |
| PATCH | `/api/v1/me/email` | `{ new_email, current_password }` |
| POST | `/api/v1/auth/change-password` | `{ current_password, new_password }` (8 to 72 chars) |
| POST | `/api/v1/auth/logout-all` | revokes every session of the user |

- Changing email or password must check `current_password` (`401` when wrong).
- After a password change, revoke the user's other sessions.
- Language and theme are applied in the browser immediately and cached locally
  (`ff_preferences`), so they also work before the backend answers.

## Notifications

`preferences.notifications` controls emails the backend sends: BTW deadline reminders
(`vat_deadline_days_before` days ahead; dates from the Tax Vault deadlines), receipts waiting
for review (instant or a daily digest), overdue invoices, and the income tax return deadline.
