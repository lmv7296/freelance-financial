// ---------------------------------------------------------------------------
// Reports: files the backend generates on request (PDF / Excel).
// See docs/reports-backend.md
// ---------------------------------------------------------------------------

export type ReportKey = "profit_loss" | "vat_summary" | "invoices" | "expenses";

export type ReportFormat = "pdf" | "xlsx";

/** GET /api/v1/reports/options */
export interface ReportOptions {
  /** Reports the backend can generate, with the formats each one supports */
  reports: { key: ReportKey; formats: ReportFormat[] }[];
  /** Years that contain invoices or expenses, newest first */
  available_years: number[];
}

/** Query parameters of GET /api/v1/reports/{key} */
export interface ReportRequest {
  format: ReportFormat;
  from: string; // YYYY-MM-DD, inclusive
  to: string; // YYYY-MM-DD, inclusive
  lang: "nl" | "en";
}
