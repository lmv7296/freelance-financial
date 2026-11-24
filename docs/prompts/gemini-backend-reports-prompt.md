You are working on the **Go backend** of FreelanceFin (PostgreSQL). The frontend has a new
**Reports** page: the user picks a report, a period and a file type (PDF or Excel), confirms,
and the file is downloaded. The backend has no reports endpoints yet. Your job is to build
them.

## Before you write any code

1. **Read the existing code first** and follow its conventions (router, handlers,
   repository/database layer, auth middleware, error format, tests).
2. **Read the attached files.** They are the source of truth:
   - `reports-backend.md`: the reports, the rules for the numbers, the two endpoints,
     file names, headers and errors
   - `reports.d.ts`: the types the frontend expects
3. **Find out where the data lives and tell me.** The database has two sets of tables
   for the same things:
   - invoices: `invoices` + `invoice_items` (per `user_id`, amounts as `numeric`) and
     `company_invoices` (per `company_id`, amounts in cents)
   - expenses: `expenses` (per `user_id`) and `company_expenses` (per `company_id`, with
     `status`, `vat_lines`, `receipt_url`)

   Check which tables the existing `/api/v1/invoices`, `/api/v1/expenses` and
   `/api/v1/tax-vault` endpoints read and write, and use the **same** tables, so the
   reports match the rest of the app. If it isn't clear or they disagree, **stop and ask
   me**.
4. Give me a short plan and **ask me questions** where something is unclear. Don't guess,
   and don't make up tax rules or numbers.

## What to build

### 1. `GET /api/v1/reports/options`

Returns which reports and formats work, and the years that have invoices or expenses
(newest first). Lists are `[]`, never `null` (initialise slices with `make([]T, 0)`).
Only list a report once it actually works.

### 2. `GET /api/v1/reports/{key}`

Query `format` (`pdf` / `xlsx`), `from` and `to` (`YYYY-MM-DD`, inclusive), `lang`
(`nl` / `en`). Builds the report for the logged-in user's company and returns the file
with `Content-Type` and `Content-Disposition` as described in `reports-backend.md`.

The four reports: `profit_loss`, `vat_summary`, `invoices`, `expenses`. Their contents
and the rules for the numbers are in `reports-backend.md`. In short:

- invoices count on their issue date, without `DRAFT` and `CANCELLED`
- expenses count on their receipt date, only approved ones
- `vat_summary` **reuses the Tax Vault's VAT calculation** (don't write a second one)
- an empty period gives a report saying there is no data, not an error

Every report has a header with the company's name, KvK number, VAT number and logo,
read from the `companies` table (`name`, `kvk_number`, `vat_number`, `logo_path`).

### 3. CORS

The frontend runs on another origin. Add `Content-Disposition` to
`Access-Control-Expose-Headers`, otherwise the browser can't read the file name.

### 4. PDF and Excel

**Ask me which Go libraries to use** before adding dependencies. Tell me what you'd
suggest and why. Excel files use real numbers and dates (not text), one sheet per part
of the report.

### 5. Texts

Headings, column names and file names in Dutch (`lang=nl`) and English (`lang=en`).
Amounts formatted per language in the PDF (`€ 1.234,56` / `€1,234.56`).

## Things to ask me about, not decide yourself

- Which invoice and expense tables to use (see above), if unclear.
- Invoices or expenses in another currency than EUR.
- How expenses that are pending review are shown (the doc says: left out).
- The PDF and Excel libraries.
- Whether generating should become a background job, if real data makes it slow.

## Tests

At least:
- `options` returns `[]` instead of `null` when there is no data.
- A user only ever gets their own company's data.
- `profit_loss` leaves out draft and cancelled invoices and unapproved expenses.
- `vat_summary` gives the same totals as `GET /api/v1/tax-vault` for the same quarter.
- An empty period returns `200` with a file.
- `422` for `from` after `to`, an unknown format or language; `404` for an unknown report.
- The `Content-Disposition` header and file name per period type.

## When you're done

Tell me which endpoints were added, which tables each report reads, any new dependencies,
and anything you had to assume.
