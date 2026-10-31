# Tax Vault: backend contract

The Tax Vault page (`/tax-vault`) shows estimates (BTW per period, income tax + Zvw for the
year, monthly set-aside advice, deadlines) and lets the user export their bookkeeping for the
accountant. **The frontend calculates nothing and contains no tax figures.** The backend
calculates everything from data in the database, and returns the steps and the rules it used,
so the page can show how every number was reached.

Response types: [`src/types/taxVault.d.ts`](../src/types/taxVault.d.ts).

## 1. Tax rules live in the database

Rates change every year (sometimes mid-year: the 2026 second bracket changed in January 2026).
Store them as data so they can be updated without a deploy.

```sql
CREATE TABLE tax_rules (
  id           UUID PRIMARY KEY,
  tax_year     INT          NOT NULL,
  jurisdiction TEXT         NOT NULL DEFAULT 'NL',
  legal_form   TEXT,                    -- 'eenmanszaak', 'bv', NULL = applies to all
  key          TEXT         NOT NULL,   -- e.g. 'ib.box1.brackets'
  label        TEXT         NOT NULL,   -- shown to the user
  value_type   TEXT         NOT NULL,   -- amount | percentage | number | brackets | piecewise | list | deadline_rule
  value        JSONB        NOT NULL,
  conditions   JSONB        NOT NULL DEFAULT '{}',  -- matched against the tax profile
  source_url   TEXT         NOT NULL,   -- official source, required
  verified_at  DATE         NOT NULL,   -- when someone last checked it against the source
  valid_from   DATE,                    -- optional: mid-year changes
  valid_to     DATE
);
CREATE INDEX ON tax_rules (tax_year, legal_form, key);
```

- Seed for 2026 (eenmanszaak + BTW): [`tax-rules-2026-nl.json`](./tax-rules-2026-nl.json),
  verified against belastingdienst.nl on 2026-10-30.
- Rule lookup: `tax_year` + `legal_form` (or NULL) + `key`, then the row whose `conditions` all
  match the user's tax profile.
- **No silent fallback:** if a required rule is missing for a year, return an error or an
  `estimate.status = "unavailable"` with a warning. Never reuse last year's figures without
  flagging it.
- Adding BV later = new rows with `legal_form = 'bv'` (VPB brackets, etc.) and a new
  calculation that returns the same response shape (`steps[]`). The frontend renders the
  steps generically, so it needs no changes for that.

## 2. Endpoints

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/v1/tax-vault?year=2026` | `TaxVaultOverview` |
| GET | `/api/v1/tax-profile` | `{ profile: TaxProfile }` |
| PUT | `/api/v1/tax-profile` | `{ profile: TaxProfile }` |
| GET | `/api/v1/tax-vault/export-options` | `{ formats: ExportFormatOption[] }` |
| GET | `/api/v1/tax-vault/exports?year=2026` | `{ exports: TaxExport[] }` |
| POST | `/api/v1/tax-vault/exports` | `{ export: TaxExport }` (async, status `pending` → `ready`) |

Export formats come from the backend (`export-options`), so an accountant-specific format
(for example "Exact Online import CSV") can be added server-side only. Suggested initial
formats: `xlsx`, `csv`, `pdf_summary`, `receipts_zip`, `xaf` (Auditfile Financieel).

## 3. Calculation: eenmanszaak (income tax)

Order, all amounts excl. BTW:

1. **Winst** = omzet excl. BTW (invoices) − zakelijke kosten excl. BTW (approved expenses).
2. **Ondernemersaftrek** = zelfstandigenaftrek (only if `meets_hours_criterion`; at most the
   winst unless the user also gets startersaftrek) + startersaftrek (if `is_starter`).
3. **Mkb-winstvrijstelling** = 12,70% × (winst − ondernemersaftrek).
4. **Belastbare winst** = winst − ondernemersaftrek − mkb-winstvrijstelling.
5. **Belastbaar inkomen box 1** = belastbare winst + `other_box1_income` from the profile.
6. **Inkomstenbelasting** via the box 1 brackets.
7. **Aftrekbeperking**: the benefit of ondernemersaftrek and mkb-winstvrijstelling is capped at
   37,56%. If part of the income falls in the 49,50% bracket, add back the difference.
8. **Heffingskortingen**: algemene heffingskorting (on verzamelinkomen) and arbeidskorting
   (on arbeidsinkomen). The total can't exceed the tax.
9. **Zvw-bijdrage** = 4,85% × bijdrage-inkomen, up to the €79.409 maximum minus income the
   employer already paid werkgeversheffing on.
10. **Still to pay** = IB + Zvw − `provisional_assessment_paid` (voorlopige aanslag).

> ⚠️ **Check before go-live.** I could not confirm on belastingdienst.nl exactly which income
> definition is used for an ondernemer's **arbeidsinkomen** (arbeidskorting, step 8) and
> **bijdrage-inkomen Zvw** (step 9). Have the accountant confirm (see art. 8.11 Wet IB 2001
> and the Zvw rules) before relying on these two steps.

Return two scenarios:

- `to_date`: based on actual figures so far this year.
- `projected`: full-year projection. Use a simple, explainable method (e.g. profit so far ÷
  elapsed months × 12) and return the method in `projection_method` so the page can show it.

Return each step in `steps[]` with the `rule_key` it used, and every rule used in `rules_used[]`
(with `source_url` and `verified_at`).

## 4. Calculation: BTW per period

Per filing period (from `vat_filing_frequency`: month / quarter / year), return the rubrieken
as on the official return:

- 1a (21%), 1b (9%), 1c (overige tarieven), 1d (privégebruik, last return of the year only),
  1e (0% / niet bij u belast)
- 2a verleggingsregelingen binnenland (common in construction: onderaanneming)
- 3a/3b (export / EU), 4a/4b (from outside NL)
- 5a verschuldigde btw (total of 1 to 4), 5b voorbelasting (BTW on approved expenses)
- balance = 5a − 5b (positive = pay, negative = refund)

Deadline: last day of the month after the period
([source](https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/uiterste-aangifte-en-betaaldatums)).
If the user uses the KOR (`uses_kor`), no BTW is charged or deducted: return no BTW periods and
add a warning when turnover passes €20.000.

## 5. Warnings

Return `warnings[]` (`{ code, severity, message }`). The page shows them as-is. Examples:

- `kor_threshold_exceeded`: turnover above €20.000 while `uses_kor`
- `hours_criterion_unknown`: user hasn't said if they meet the 1.225 hours
- `rules_unverified`: a rule's `verified_at` is older than the start of the tax year
- `unreviewed_expenses`: expenses still `needs_review` aren't counted yet
