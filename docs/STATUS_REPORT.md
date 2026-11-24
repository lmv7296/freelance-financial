# Project status report

_Snapshot: 17 Nov 2026. Frontend `main` @ 3039178, backend `GO_Freelancer` @ 55d358f (plus one staged, uncommitted change in `internal/service/auth.go`)._

> **Update 24 Nov 2026:** The project is now a monorepo (`web/` + `api/`), and the browser reaches the API through the Next.js `/api` proxy. Done since this snapshot:
> - Frontend item 4 (the fake expense save) is fixed.
> - The test receipt images are gone. This came from GO_Freelancer PR #1, which the snapshot below missed.
> - The `auth.go` change is committed.

This was put together by reading the code. Nothing was run, so "working" means "wired end-to-end in the code", not "tested in the browser".

---

## Part 1: What works and what's missing

### Working (frontend ↔ backend wired end-to-end)

| Area | What works |
|---|---|
| **Auth** | Register, login, logout, session restore (`/auth/me`), auto-logout on 401, rate-limit countdown on login/register |
| **Email verification** | Verify-email page, "resend" banner. Emails go out through Resend or SMTP if configured, otherwise they're only printed to the backend log |
| **Onboarding** | Profile/company setup saved via `PATCH /me/profile` |
| **Dashboard** | Loads tax-vault overview, company, invoices and clients together; shows outstanding balance from invoices |
| **Clients** | List, create, client "dossier" modal with their invoice history |
| **Invoices** | List, filter by status, create, mark as paid |
| **Expenses** | List, add (with receipt photo/PDF upload as base64), edit, delete, link to client/invoice, receipt viewer |
| **Tax Vault** | Overview by year, tax profile (view/edit), VAT periods, deadlines, income tax card, export options, create/list exports and download them |
| **Reports** | Report options list, download PDF/XLSX per period and language |
| **Settings** | Account (change email, change password, log out all sessions), company details + logo upload/delete, invoice defaults, lists (categories / payment methods / VAT rates, refreshes `/config`), notifications and display preferences, WhatsApp senders (add/edit/remove) |
| **Sidebar** | Tax widget with the next deadline (uses the tax-vault overview) |
| **i18n** | EN/NL dictionaries with a `i18n:check` script |

### Missing or only partly done

**Frontend**

1. **Invoice actions are placeholders.** "Download PDF", "Copy payment link", "Send reminder" and the "Export" button on the Invoices page just show a "coming soon" alert ([invoices/page.jsx:167](../web/src/app/(pages)/invoices/page.jsx:167)). The backend has no endpoints for any of these yet.
2. **No edit/delete for clients.** `clientsApi.update` exists and the backend has `PATCH /clients/{id}`, but no screen calls it. Neither side can delete a client.
3. **No edit/delete for invoices** apart from "mark as paid". There is no invoice detail editing and no `DELETE /invoices/{id}` on the backend.
4. **Adding an expense fakes success when the backend fails.** If `POST /expenses` errors, [AddExpenseModal.jsx:331](../web/src/components/expenses/AddExpenseModal.jsx:331) builds a local expense with a fake id and shows it as saved. It disappears on reload. This was written for before the endpoint existed and should now show the error instead.
5. **`/config` silently falls back to hardcoded defaults** ([config.js](../web/src/lib/api/config.js)) if the request fails, so a broken backend can go unnoticed.
6. **Support page** is static (FAQ + support email from `NEXT_PUBLIC_SUPPORT_EMAIL`). There's no contact form or ticket backend.
7. **Unused helpers:** `authApi.checkHealth` and `expensesApi.get` are defined but never called.

**Backend**

1. **Receipt "AI" extraction isn't real yet.** [receipt_extractor.go](../api/internal/service/receipt_extractor.go) reads `GEMINI_API_KEY`/`OPENAI_API_KEY` but never uses them. It does keyword matching on the raw file bytes (e.g. "GAMMA", "SHELL"), which can't work on a JPEG/PDF. In practice: merchant "Onbekende Leverancier", amount 0.
2. **The WhatsApp webhook doesn't match Meta's real payload.** It expects a flat custom JSON (`from`, `media_base64`, …). Meta sends a nested `entry[].changes[].value.messages[]` structure, and media has to be downloaded from the Graph API with a token. There's also no reply back to the sender. Signature check and verify-token handshake are in place.
3. **No invoice PDF, payment link, reminder email or invoice delete** (see frontend item 1).
4. **No client delete.**
5. **Email** only works if `RESEND_API_KEY` or `SMTP_HOST` is set. None of the email/WhatsApp/AI variables are in `.env.example`.
6. **Tax rules have open TODOs** to confirm with an accountant ([eenmanszaak.go:154](../api/internal/service/tax/eenmanszaak.go:154) and :164).
7. **Housekeeping:**
   - ~25 test receipt images are committed under `internal/handler/uploads/receipts/`. Tests write uploads into the source tree, and they should be gitignored.
   - Staged but uncommitted: `auth.go` now returns an error when the verification email fails to send.
   - The whole backend is a single commit, and migrations are applied by hand.

---

## Part 2: Backend endpoints and who uses them

Legend: ✅ used by the frontend · ⚠️ frontend wrapper exists but nothing calls it · ❌ not used by the frontend · 🌐 meant for an external caller, not the frontend

All paths are on the Go API (default `http://localhost:8085`). 🔒 = requires login.

### Health

| Endpoint | What it does | Used by | Status |
|---|---|---|---|
| `GET /healthz` | Liveness check | `authApi.checkHealth` (never called) | ⚠️ |
| `GET /readyz` | Readiness check (DB reachable) | — | 🌐 for Docker/hosting probes |
| `GET /api/v1/health` | Same as `/healthz` | `authApi.checkHealth` fallback (never called) | ⚠️ |

### Auth & account

| Endpoint | What it does | Used by | Status |
|---|---|---|---|
| `POST /api/v1/auth/register` | Create user + company, start session, send verification mail (rate limited) | `AuthContext` ← register page / `AuthModal` | ✅ |
| `POST /api/v1/auth/login` | Log in, set cookie + return token (rate limited) | `AuthContext` ← login page / `AuthModal` | ✅ |
| `POST /api/v1/auth/logout` | End the current session | `AuthContext` ← Sidebar logout | ✅ |
| `GET /api/v1/auth/me` 🔒 | Current user | `AuthContext` (session restore on load) | ✅ |
| `POST /api/v1/auth/verify-email` | Confirm the email with a token from the mail | `verify-email/page.jsx` | ✅ |
| `POST /api/v1/auth/resend-verification` 🔒 | Send the verification mail again | `VerifyEmailBanner.jsx` | ✅ |
| `POST /api/v1/auth/change-password` 🔒 | Change password (needs the current one) | Settings → `AccountSection.jsx` | ✅ |
| `POST /api/v1/auth/logout-all` 🔒 | Revoke all sessions | Settings → `AccountSection.jsx` | ✅ |
| `PATCH /api/v1/me/email` 🔒 | Change email (needs the password) | Settings → `AccountSection.jsx` | ✅ |
| `PATCH /api/v1/me/profile` 🔒 | Save onboarding profile/company data | `onboarding/page.jsx` | ✅ |
| `GET /api/v1/me/preferences` 🔒 | Language, display, notification prefs | `PreferencesContext.jsx`, `NotificationsSection.jsx` | ✅ |
| `PATCH /api/v1/me/preferences` 🔒 | Update preferences | `PreferencesContext.jsx`, `NotificationsSection.jsx`, `DisplaySection.jsx` | ✅ |

### Reference data & lists

| Endpoint | What it does | Used by | Status |
|---|---|---|---|
| `GET /api/v1/config` 🔒 | Payment methods, VAT rates, categories, common merchants | `configApi` ← `AuthContext` (on login), `ListsSection` (after save), `useAppConfig` in `AddExpenseModal` / `InvoiceDefaultsSection` | ✅ |
| `GET /api/v1/settings/lists` 🔒 | Company's editable lists | Settings → `ListsSection.jsx` | ✅ |
| `PUT /api/v1/settings/lists` 🔒 | Replace those lists | Settings → `ListsSection.jsx` | ✅ |

### Expenses & receipts

| Endpoint | What it does | Used by | Status |
|---|---|---|---|
| `GET /api/v1/expenses` 🔒 | List expenses (filters via query) | `expenses/page.jsx` | ✅ |
| `GET /api/v1/expenses/{id}` 🔒 | One expense | `expensesApi.get` (never called, the detail modal uses list data) | ⚠️ |
| `POST /api/v1/expenses` 🔒 | Create expense, store base64 receipt file | `AddExpenseModal.jsx` | ✅ |
| `PATCH /api/v1/expenses/{id}` 🔒 | Edit / approve / reject / relink | `ExpenseDetailModal.jsx` | ✅ |
| `DELETE /api/v1/expenses/{id}` 🔒 | Delete expense | `ExpenseDetailModal.jsx` | ✅ |
| `GET /api/v1/receipts/{id}` 🔒 | Serve the receipt image/PDF | Indirect: `receipt_url` in `<img>` on `expenses/page.jsx`, `ReceiptViewer.jsx` | ✅ |

### Clients & invoices

| Endpoint | What it does | Used by | Status |
|---|---|---|---|
| `GET /api/v1/clients` 🔒 | List clients | `clients/page.jsx`, `invoices/page.jsx`, `dashboard/page.jsx`, `ClientAutocomplete`, `AddExpenseModal` / `ExpenseDetailModal` (linking) | ✅ |
| `POST /api/v1/clients` 🔒 | Create client | `clients/page.jsx`, `invoices/page.jsx` (new client while invoicing) | ✅ |
| `PATCH /api/v1/clients/{id}` 🔒 | Update client | `clientsApi.update` (never called, no edit-client UI) | ⚠️ |
| `GET /api/v1/invoices` 🔒 | List invoices (optional `client_id`) | `invoices/page.jsx`, `clients/page.jsx`, `dashboard/page.jsx`, expense modals (linking) | ✅ |
| `POST /api/v1/invoices` 🔒 | Create invoice | `invoices/page.jsx` | ✅ |
| `PATCH /api/v1/invoices/{id}` 🔒 | Update invoice (used for "mark paid") | `invoices/page.jsx` | ✅ |

### Company settings

| Endpoint | What it does | Used by | Status |
|---|---|---|---|
| `GET /api/v1/settings/company` 🔒 | Company details | `CompanySection.jsx`, `dashboard/page.jsx`, `ClientInvoicePreview.jsx` | ✅ |
| `PATCH /api/v1/settings/company` 🔒 | Update company details | `CompanySection.jsx` | ✅ |
| `POST /api/v1/settings/company/logo` 🔒 | Upload logo (multipart) | `CompanySection.jsx` | ✅ |
| `DELETE /api/v1/settings/company/logo` 🔒 | Remove logo | `CompanySection.jsx` | ✅ |
| `GET /api/v1/settings/company/logo` 🔒 | Serve the logo file | Indirect: `logo_url` in `<img>` in `CompanySection.jsx` | ✅ |
| `GET /api/v1/settings/invoice-defaults` 🔒 | Default payment terms, VAT, notes for invoices | `InvoiceDefaultsSection.jsx` | ✅ |
| `PATCH /api/v1/settings/invoice-defaults` 🔒 | Update them | `InvoiceDefaultsSection.jsx` | ✅ |

### WhatsApp

| Endpoint | What it does | Used by | Status |
|---|---|---|---|
| `GET /api/v1/settings/whatsapp` 🔒 | Business number + allowed senders | `WhatsAppSection.jsx` | ✅ |
| `POST /api/v1/settings/whatsapp/senders` 🔒 | Add a phone that may send receipts | `WhatsAppSection.jsx` | ✅ |
| `PATCH /api/v1/settings/whatsapp/senders/{id}` 🔒 | Edit / (de)activate sender | `WhatsAppSection.jsx` | ✅ |
| `DELETE /api/v1/settings/whatsapp/senders/{id}` 🔒 | Remove sender | `WhatsAppSection.jsx` | ✅ |
| `GET /api/v1/webhooks/whatsapp` | Meta verify-token handshake | WhatsApp/Meta | 🌐 |
| `POST /api/v1/webhooks/whatsapp` | Incoming receipt message → creates an expense (HMAC-signed) | WhatsApp/Meta (payload format doesn't match Meta yet) | 🌐 |

### Tax Vault

| Endpoint | What it does | Used by | Status |
|---|---|---|---|
| `GET /api/v1/tax-vault` 🔒 | Year overview: VAT periods, income tax estimate, deadlines, rules used | `tax-vault/page.jsx`, `dashboard/page.jsx`, `SidebarTaxWidget.jsx` | ✅ |
| `GET /api/v1/tax-profile` 🔒 | Tax profile (hours criterion, starter, etc.) | `tax-vault/page.jsx`, `TaxProfileModal.jsx` | ✅ |
| `PUT /api/v1/tax-profile` 🔒 | Save tax profile | `TaxProfileModal.jsx` | ✅ |
| `GET /api/v1/tax-vault/export-options` 🔒 | Which exports can be made | `tax-vault/page.jsx` | ✅ |
| `GET /api/v1/tax-vault/exports` 🔒 | Export history for a year | `tax-vault/page.jsx` → `ExportsCard.jsx` | ✅ |
| `POST /api/v1/tax-vault/exports` 🔒 | Generate an export | `ExportModal.jsx` | ✅ |

### Reports

| Endpoint | What it does | Used by | Status |
|---|---|---|---|
| `GET /api/v1/reports/options` 🔒 | Available reports and formats | `reports/page.jsx` | ✅ |
| `GET /api/v1/reports/{key}` 🔒 | Download a report (PDF/XLSX, `from`/`to`/`lang`) | `ReportDownloadModal.jsx` | ✅ |

### Summary

- **51 routes** in total.
- **44 used by the frontend**, 2 of them indirectly through image URLs.
- **3 have a frontend wrapper that nothing calls:**
  - `GET /expenses/{id}`
  - `PATCH /clients/{id}`
  - `/healthz` + `/api/v1/health`
- **3 aren't meant for the frontend:**
  - `/readyz`
  - both WhatsApp webhook routes
- **No frontend call hits a missing backend route.** The gaps run the other way: the invoice PDF/link/reminder/export buttons have no backend endpoint yet.
