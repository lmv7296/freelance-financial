# Reports: backend contract

The Reports page (`/reports`) has one button per report. The button opens a pop-up where
the user picks a period and a file type and confirms; the frontend then requests the
file and the browser saves it in the user's Downloads folder. The backend builds the
report from the user's own data at that moment; nothing is stored.

Types: `src/types/reports.d.ts`. Field names are `snake_case`. Errors use
`{ "error": "..." }`.

## Reports

| Key | Name (nl / en) | Contents |
| --- | --- | --- |
| `profit_loss` | Winst & verlies / Profit & loss | Revenue from invoices excl. VAT, costs per category excl. VAT, result (revenue − costs) |
| `vat_summary` | Btw-overzicht / VAT summary | VAT charged on revenue per rate, VAT paid on costs (voorbelasting), balance to pay or get back |
| `invoices` | Facturen & openstaande posten / Invoices & open items | All invoices in the period with status; invoices still unpaid on the `to` date (open and overdue, with days overdue); revenue per client |
| `expenses` | Uitgaven per categorie / Expenses by category | All expenses in the period; totals per category with VAT; whether each expense has a receipt |

Rules for the numbers (the same as the rest of the app, so reports match the dashboard
and the Tax Vault):

- **Invoices count on their issue date.** Leave out `DRAFT` and `CANCELLED`.
- **Expenses count on their receipt date.** Only approved expenses (not pending review
  or rejected).
- **`vat_summary` uses the same calculation as the Tax Vault** (`GET /api/v1/tax-vault`,
  the VAT periods and their rubrieken), so the two never disagree. Show the rubriek
  numbers (1a, 1b, 5b, …) next to the amounts.
- Amounts in euros with 2 decimals. If an invoice or expense is in another currency,
  ask before deciding how to handle it.
- An empty period is not an error: return a report that says there is no data.

Every report has a header with the company name, KvK number, VAT number and logo (from
`companies`), the report name, the period and the date it was made.

## Endpoints

| Method | Path | Auth | Request → response |
| --- | --- | --- | --- |
| GET | `/api/v1/reports/options` | yes | none → `ReportOptions` (JSON) |
| GET | `/api/v1/reports/{key}` | yes | query `format`, `from`, `to`, `lang` → the file |

### `GET /api/v1/reports/options`

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

- `reports`: only the reports and formats that actually work. The frontend disables the
  button of a report that is missing, so a report can go live one at a time.
- `available_years`: years that have at least one invoice or expense, newest first.
  The frontend always adds the current year.
- Lists are `[]`, never `null`.

### `GET /api/v1/reports/{key}?format=pdf&from=2026-07-01&to=2026-09-30&lang=nl`

| Parameter | Values |
| --- | --- |
| `format` | `pdf` or `xlsx` |
| `from`, `to` | `YYYY-MM-DD`, both inclusive. The frontend sends a whole month, quarter or year, or (except for `vat_summary`) any custom range |
| `lang` | `nl` or `en`: language of the headings, labels and file name |

Success: `200` with the file as the body.

- `Content-Type`: `application/pdf` or
  `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="winst-en-verlies_2026-Q3.pdf"; filename*=UTF-8''winst-en-verlies_2026-Q3.pdf`
- **CORS:** the frontend runs on another origin, so add
  `Access-Control-Expose-Headers: Content-Disposition`; without it the browser hides the
  file name and the frontend falls back to `profit_loss_2026-07-01_2026-09-30.pdf`.

File name: report name in `lang`, then the period: `2026-Q3` for a quarter, `2026-07` for
a month, `2026` for a year, `2026-07-01_2026-08-15` for a custom range.

The Excel file has one sheet per part of the report (e.g. for `invoices`: "Facturen",
"Openstaand", "Per klant") with real numbers and dates (not text), so the user can
calculate with them.

Errors (JSON):

| Status | When |
| --- | --- |
| `404` | Unknown report key |
| `422` | Invalid `format`, `lang` or dates, `from` after `to`, or a custom range for `vat_summary` that is not a whole month, quarter or year |
| `401` | Not logged in |

The report is generated in the request (no background job). If generating takes longer
than a few seconds for real data, tell the frontend developer so it can switch to a
background job with a download link, like the Tax Vault exports.
