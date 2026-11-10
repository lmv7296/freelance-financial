package model

// ReportKey represents the unique identifier of a report.
type ReportKey string

const (
	ReportKeyProfitLoss  ReportKey = "profit_loss"
	ReportKeyVatSummary  ReportKey = "vat_summary"
	ReportKeyInvoices    ReportKey = "invoices"
	ReportKeyExpenses    ReportKey = "expenses"
)

// ReportFormat represents supported download formats.
type ReportFormat string

const (
	ReportFormatPDF  ReportFormat = "pdf"
	ReportFormatXLSX ReportFormat = "xlsx"
)

// ReportItem specifies a supported report and its available formats.
type ReportItem struct {
	Key     ReportKey      `json:"key"`
	Formats []ReportFormat `json:"formats"`
}

// ReportOptions defines the payload for GET /api/v1/reports/options.
type ReportOptions struct {
	Reports        []ReportItem `json:"reports"`
	AvailableYears []int        `json:"available_years"`
}

// ReportParams holds parsed and validated query parameters for GET /api/v1/reports/{key}.
type ReportParams struct {
	Key    ReportKey
	Format ReportFormat
	From   string // YYYY-MM-DD
	To     string // YYYY-MM-DD
	Lang   string // nl or en
}

