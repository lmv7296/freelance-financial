# Onboarding & email verification: backend contract

After signing up (email + password) the user goes through an onboarding wizard
(`/onboarding`) that asks for their personal details and their business details. App
pages redirect there until the profile is complete. Email verification works through a
link in an email; the app stays usable before that, with a banner and a "send again"
button.

Types: `src/types/user.d.ts`. Field names are `snake_case`. Errors use `{ "error": "..." }`.

## Where the data lives

Personal data is on `users`, the business is on `companies` (one company per user for
now, `users.company_id`). Migration `docs/db/005_companies_hold_business_data.sql` has
already moved the business fields to `companies` and given every user a company.

| API field | Stored in | Filled in by | Notes |
| --- | --- | --- | --- |
| `email` | `users.email` | user, at sign-up | |
| `full_name` | `users.full_name` | user, onboarding | required |
| `phone_number` | `users.phone_number` | user, onboarding | required, E.164 (`+31612345678`) |
| `business_name` | `companies.name` | user, onboarding | required |
| `legal_form` | `companies.legal_form` | user, onboarding | required: `eenmanszaak`, `vof` or `bv` |
| `vat_number` | `companies.vat_number` | user, onboarding | optional (a new business may not have it yet) |
| `country` | `companies.country` | user, onboarding | required, ISO 3166-1 alpha-2; the frontend offers all countries, NL first |
| `tax_regime` | `companies.tax_regime` | **backend** | e.g. `NL_BTW_STANDARD`, `ES_AUTONOMO_GENERAL`; the frontend never sends it. Set it from `country` the way the backend does today |
| `is_verified` | `users.is_verified` | backend | `false` at sign-up, `true` after the email link is opened |
| `id`, `company_id`, `created_at`, `updated_at` | `users` | backend | |
| (`password_hash`) | `users` | backend | never returned |

`users.business_name`, `users.vat_number`, `users.tax_regime` and the `company_settings`
table are old copies. Stop reading and writing them, then run
`docs/db/006_drop_old_business_columns.sql`. `tax_profiles.legal_form` is also replaced
by `companies.legal_form`.

The frontend treats the profile as complete when `full_name`, `phone_number`,
`country`, `business_name` and `legal_form` are all filled in.

## User object in responses

`POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `GET /api/v1/auth/me` and the
endpoints below return the user **with the company fields joined in**:

```json
{
  "user": {
    "id": "db75231a-7fe6-71f7-ef41-abcb0e12ca14",
    "email": "jan@devriesbouw.nl",
    "full_name": "Jan de Vries",
    "phone_number": "+31612345678",
    "business_name": "De Vries Bouw & Montage",
    "legal_form": "eenmanszaak",
    "vat_number": "NL123456789B01",
    "country": "NL",
    "tax_regime": "NL_BTW_STANDARD",
    "is_verified": false,
    "company_id": "41df669a9296d77a9ed74f72a6ac3c66",
    "created_at": "2026-11-01T10:00:00Z",
    "updated_at": "2026-11-01T10:05:00Z"
  }
}
```

Unfilled fields are `null`. If login or `/auth/me` leaves these fields out, the user is
sent to onboarding again after every page load. `business_name` is `companies.name`;
new companies get the placeholder name `Mijn Bedrijf` at sign-up, so return `null` for
`business_name` until the user has saved a real name (or create the company without a
placeholder).

## Endpoints

| Method | Path | Auth | Body → response |
| --- | --- | --- | --- |
| PATCH | `/api/v1/me/profile` | yes | `UpdateProfileRequest` → `{ user }` |
| POST | `/api/v1/auth/verify-email` | **no** | `{ token }` → `{ user }` |
| POST | `/api/v1/auth/resend-verification` | yes | none → `{ message }` |

### `PATCH /api/v1/me/profile`

Updates only the fields that are sent, in one transaction: `full_name` and
`phone_number` on `users`; `business_name`, `legal_form`, `vat_number` and `country` on
the user's company. Only the company's `owner` may change the company fields (`403`
for a `member`). Validation (return `422` with a readable `error`):

- `full_name`, `business_name`: not empty after trimming, max 255 characters.
- `phone_number`: normalise to E.164 (`06 1234 5678` with country NL → `+31612345678`),
  reject when that's not possible. Must stay unique (`409`).
- `country`: a valid ISO 3166-1 alpha-2 code, stored uppercase. When it changes, update
  `companies.tax_regime` to match.
- `legal_form`: one of `eenmanszaak`, `vof`, `bv` (the database has a check constraint).
- `vat_number`: optional; `null` or empty clears it. Uppercase, strip spaces and dots.
  When `country` is `NL`: `NL` + 9 digits + `B` + 2 digits. Otherwise: 2-letter prefix
  + 2 to 13 letters/digits.

The Tax Vault calculation only supports `eenmanszaak` for now; for `vof` and `bv` it
should return `income_tax.status = "unavailable"` with a warning.

### Email verification

There is already an `email_verification_tokens` table; reuse it.

1. **At sign-up** (and when the email changes through `PATCH /api/v1/me/email`): set
   `is_verified = false`, create a token and send an email with the link
   `{FRONTEND_URL}/verify-email?token={token}`.
   - Token: at least 32 random bytes, URL-safe. Store only a **hash** of it, with an
     expiry (24 hours suggested). One active token per user; a new one replaces the old.
2. **`POST /api/v1/auth/verify-email`** works without being logged in (the link may be
   opened on another device). Valid token → set `is_verified = true`, delete the token,
   return `{ user }`. Invalid, used or expired → `400` with an `error`. Don't return `401`.
3. **`POST /api/v1/auth/resend-verification`**: new token + email for the logged-in user.
   Rate limit it (e.g. once per minute, 5 per hour → `429`). Already verified → `200`
   without sending.

The frontend shows the banner only when `is_verified` is exactly `false`.

**Open decision:** which email service sends these emails (same choice as the Phase 5
notification emails). Ask before building it.
