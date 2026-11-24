You are working on the **Go backend** of FreelanceFin (PostgreSQL). The database has
been restructured: a user's **own business data now lives on the `companies` table**
instead of on `users` and `company_settings`. The Go code still reads and writes the old
columns, which breaks the new onboarding in the frontend. Your job is to switch the code
over to `companies`.

## Before you write any code

1. **Read the existing code first** and follow its conventions (router, handlers,
   repository/database layer, migrations folder and numbering, error format, tests).
2. **Read the attached files.** They are the source of truth:
   - `onboarding-backend.md`: the user object, `PATCH /api/v1/me/profile`, email
     verification, and which API field is stored in which column
   - `settings-backend.md` + `settings.d.ts`: the company settings API (unchanged for the
     frontend)
   - `user.d.ts`: the `User` type the frontend expects
   - `005_companies_hold_business_data.sql`: **already applied** to the database
   - `006_drop_old_business_columns.sql`: to run **after** your changes
3. **Find every place** that uses `users.business_name`, `users.vat_number`,
   `users.tax_regime`, the `company_settings` table and `tax_profiles.legal_form`, and
   list them for me.
4. Give me a short plan and **ask me questions** where something is unclear. Don't guess.

## What the database looks like now (migration 005, already applied)

- `companies`: `id`, `name` (NOT NULL), `trade_name`, `legal_form` (`eenmanszaak` / `vof`
  / `bv`, check constraint, nullable), `tax_regime` (e.g. `NL_BTW_STANDARD`,
  `ES_AUTONOMO_GENERAL`), `started_on`, `kvk_number`, `kvk_branch_number`, `vat_number`,
  `rsin`, `street`, `postal_code`, `city`, `country` (char 2, default `NL`), `email`,
  `phone`, `website`, `iban`, `iban_holder_name`, `logo_path`, `created_at`, `updated_at`.
- `users`: gained `role` (`owner` / `member`, default `owner`). Every user now has a
  `company_id`, and each existing user is the owner of their own company.
- The old columns (`users.business_name`, `users.vat_number`, `users.tax_regime`), the
  `company_settings` table and `tax_profiles.legal_form` **still exist** but must no
  longer be used.

## What to change

### 1. A new migration (next number in the migrations folder)

Some data was written to the old columns after 005 ran (e.g. a profile saved through the
current code). Before the code switches over:

- Copy `users.business_name`, `users.vat_number` and `users.phone_number` to the user's
  company again where the user's value is filled in (same logic as step 3 of 005;
  `business_name` → `companies.name`).
- Make `companies.name` **nullable**, and set it to `NULL` where it is still the sign-up
  placeholder `Mijn Bedrijf`. The frontend treats an empty `business_name` as "onboarding
  not done"; a placeholder name makes it skip that question. **Check first** whether any
  code (invoices, exports, PDFs) assumes `name` is never null, and tell me.

### 2. Sign-up

- `POST /api/v1/auth/register`: create the company with `name = NULL` (no placeholder),
  `country` from the request or `NL`, and the user as `role = 'owner'`.
- Keep setting `companies.tax_regime` from the country the way the code does today.

### 3. The user object

Login, register, `GET /api/v1/auth/me` and `PATCH /api/v1/me/profile` return the user
**with the company fields joined in**, exactly as in `onboarding-backend.md`:
`business_name` (= `companies.name`), `legal_form`, `vat_number`, `country`,
`tax_regime`, plus `is_verified` and `company_id`. Unfilled fields are `null`, never
missing and never `""`.

### 4. `PATCH /api/v1/me/profile`

In one transaction: `full_name` and `phone_number` on `users`; `business_name`,
`legal_form`, `vat_number` and `country` on the company. Only the `owner` may change
company fields (`403` for a `member`). Validation as in `onboarding-backend.md` (`422`
with a readable error). When `country` changes, update `companies.tax_regime`.

### 5. Company settings

`GET/PATCH /api/v1/settings/company` and the logo endpoints keep **the same API shape**
(`CompanySettings` in `settings.d.ts`), but read and write `companies`:
`company_name` ↔ `companies.name`, `logo_url` is built from `companies.logo_path`, the
other fields map one-to-one.

### 6. Tax Vault

Read the legal form from `companies.legal_form` instead of `tax_profiles.legal_form`.
`GET/PUT /api/v1/tax-profile` keeps returning `legal_form` in the API, taken from the
company. The calculation only supports `eenmanszaak`; for `vof`, `bv` or no legal form,
return `income_tax.status = "unavailable"` with a warning.

### 7. Email verification

Build `POST /api/v1/auth/verify-email` and `POST /api/v1/auth/resend-verification` as
described in `onboarding-backend.md`, reusing the existing `email_verification_tokens`
table. **Ask me which email service to use before building the sending part.**

### 8. Clean up

Once nothing uses the old columns any more, tell me, so I can run
`006_drop_old_business_columns.sql`. **Don't run it yourself.**

## Tests

At least:
- Profile update writes to the right tables and returns the joined user.
- A `member` can't change company fields.
- `/auth/me` returns `null` (not `"Mijn Bedrijf"`) for `business_name` after sign-up.
- Company settings read and write `companies`.
- The Tax Vault uses `companies.legal_form`.

## When you're done

Tell me which endpoints changed, which migration to run, and anything you had to assume.
