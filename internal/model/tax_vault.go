package model

import (
	"encoding/json"
	"time"
)

type LegalForm string

const (
	LegalFormEenmanszaak LegalForm = "eenmanszaak"
	LegalFormVOF         LegalForm = "vof"
	LegalFormBV          LegalForm = "bv"
)

type VatFilingFrequency string

const (
	VatFilingFrequencyMonth   VatFilingFrequency = "month"
	VatFilingFrequencyQuarter VatFilingFrequency = "quarter"
	VatFilingFrequencyYear    VatFilingFrequency = "year"
)

// TaxRule represents a rule in the tax_rules table.
type TaxRule struct {
	ID           string                 `json:"id"`
	TaxYear      int                    `json:"tax_year"`
	Jurisdiction string                 `json:"jurisdiction"`
	LegalForm    *string                `json:"legal_form"` // "eenmanszaak", "bv", nil for all
	Key          string                 `json:"key"`
	Label        string                 `json:"label"`
	ValueType    string                 `json:"value_type"` // amount | percentage | number | brackets | piecewise | list | deadline_rule
	Value        json.RawMessage        `json:"value"`
	Conditions   map[string]interface{} `json:"conditions"`
	SourceURL    string                 `json:"source_url"`
	VerifiedAt   string                 `json:"verified_at"` // YYYY-MM-DD
	ValidFrom    *string                `json:"valid_from,omitempty"`
	ValidTo      *string                `json:"valid_to,omitempty"`
}

// TaxProfile defines the tax profile of a company/user.
type TaxProfile struct {
	LegalForm                    LegalForm          `json:"legal_form"`
	VatFilingFrequency           VatFilingFrequency `json:"vat_filing_frequency"`
	UsesKOR                      bool               `json:"uses_kor"`
	MeetsHoursCriterion          *bool              `json:"meets_hours_criterion"` // null = unknown
	IsStarter                    bool               `json:"is_starter"`
	ReachedAOWAge                bool               `json:"reached_aow_age"`
	OtherBox1Income              *float64           `json:"other_box1_income"`              // decimal euros in API
	ProvisionalAssessmentMonthly *float64           `json:"provisional_assessment_monthly"` // decimal euros in API
	AccountantName               *string            `json:"accountant_name"`
	AccountantEmail              *string            `json:"accountant_email"`
	DefaultExportFormats         []string           `json:"default_export_formats"`
	UpdatedAt                    string             `json:"updated_at"`
}

type TaxRuleUsed struct {
	Key          string      `json:"key"`
	Label        string      `json:"label"`
	ValueType    string      `json:"value_type"`
	Value        interface{} `json:"value"`
	DisplayValue string      `json:"display_value"`
	TaxYear      int         `json:"tax_year"`
	SourceURL    string      `json:"source_url"`
	VerifiedAt   string      `json:"verified_at"`
}

type TaxWarning struct {
	Code     string `json:"code"`
	Severity string `json:"severity"` // "info" | "warning" | "critical"
	Message  string `json:"message"`
}

type VatRubriek struct {
	Code     string   `json:"code"`
	Label    string   `json:"label"`
	Turnover *float64 `json:"turnover"`
	Vat      *float64 `json:"vat"`
}

type VatPeriod struct {
	Key        string       `json:"key"`
	Label      string       `json:"label"`
	StartDate  string       `json:"start_date"`
	EndDate    string       `json:"end_date"`
	Deadline   string       `json:"deadline"`
	Status     string       `json:"status"` // "open" | "to_file" | "filed" | "paid"
	IsEstimate bool         `json:"is_estimate"`
	VatDue     float64      `json:"vat_due"`
	InputVat   float64      `json:"input_vat"`
	Balance    float64      `json:"balance"`
	Rubrieken  []VatRubriek `json:"rubrieken"`
}

type TaxCalculationStep struct {
	Key     string  `json:"key"`
	Label   string  `json:"label"`
	Amount  float64 `json:"amount"`
	Kind    string  `json:"kind"` // "income" | "deduction" | "subtotal" | "tax" | "credit" | "total"
	RuleKey *string `json:"rule_key"`
	Note    *string `json:"note"`
}

type TaxComponent struct {
	Key    string  `json:"key"`
	Label  string  `json:"label"`
	Amount float64 `json:"amount"`
}

type TaxScenario struct {
	BasisLabel                string               `json:"basis_label"`
	Profit                    float64              `json:"profit"`
	TaxableIncome             float64              `json:"taxable_income"`
	TotalTax                  float64              `json:"total_tax"`
	ProvisionalAssessmentPaid float64              `json:"provisional_assessment_paid"`
	StillToPay                float64              `json:"still_to_pay"`
	EffectiveRate             float64              `json:"effective_rate"`
	Components                []TaxComponent       `json:"components"`
	Steps                     []TaxCalculationStep `json:"steps"`
}

type IncomeTaxEstimate struct {
	Status           string       `json:"status"` // "available" | "unavailable"
	Kind             string       `json:"kind"`   // "inkomstenbelasting" | "vennootschapsbelasting"
	Label            string       `json:"label"`
	ProjectionMethod *string      `json:"projection_method"`
	ToDate           *TaxScenario `json:"to_date"`
	Projected        *TaxScenario `json:"projected"`
}

type SetAsideAdvice struct {
	MonthlyAmount   float64        `json:"monthly_amount"`
	MonthsRemaining int            `json:"months_remaining"`
	Components      []TaxComponent `json:"components"`
	Explanation     string         `json:"explanation"`
}

type TaxDeadline struct {
	Key         string   `json:"key"`
	Date        string   `json:"date"`
	Type        string   `json:"type"` // "vat_return" | "income_tax_return" | "payment" | "other"
	Label       string   `json:"label"`
	Description *string  `json:"description"`
	Status      string   `json:"status"` // "upcoming" | "due_soon" | "overdue" | "done"
	Amount      *float64 `json:"amount"`
	SourceURL   *string  `json:"source_url"`
}

type TaxVaultTotals struct {
	RevenueExclVat         float64 `json:"revenue_excl_vat"`
	ExpensesExclVat        float64 `json:"expenses_excl_vat"`
	Profit                 float64 `json:"profit"`
	UnreviewedExpensesCount int     `json:"unreviewed_expenses_count"`
}

type TaxVaultVatOverview struct {
	Enabled bool        `json:"enabled"`
	Periods []VatPeriod `json:"periods"`
}

type TaxVaultOverview struct {
	TaxYear         int                 `json:"tax_year"`
	AvailableYears  []int               `json:"available_years"`
	LegalForm       LegalForm           `json:"legal_form"`
	GeneratedAt     string              `json:"generated_at"`
	ProfileComplete bool                `json:"profile_complete"`
	Totals          TaxVaultTotals      `json:"totals"`
	Vat             TaxVaultVatOverview `json:"vat"`
	IncomeTax       IncomeTaxEstimate   `json:"income_tax"`
	SetAside        *SetAsideAdvice     `json:"set_aside"`
	Deadlines       []TaxDeadline       `json:"deadlines"`
	Warnings        []TaxWarning        `json:"warnings"`
	RulesUsed       []TaxRuleUsed       `json:"rules_used"`
}

type ExportFormatOption struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

type CreateTaxExportRequest struct {
	TaxYear          int      `json:"tax_year"`
	PeriodKey        string   `json:"period_key"`
	Formats          []string `json:"formats"`
	SendToAccountant bool     `json:"send_to_accountant"`
	Note             *string  `json:"note"`
	SaveAsDefault    bool     `json:"save_as_default"`
}

type TaxExport struct {
	ID          string   `json:"id"`
	TaxYear     int      `json:"tax_year"`
	PeriodKey   string   `json:"period_key"`
	PeriodLabel string   `json:"period_label"`
	Formats     []string `json:"formats"`
	Status      string   `json:"status"` // "pending" | "ready" | "failed"
	DownloadURL *string  `json:"download_url"`
	SentTo      *string  `json:"sent_to"`
	Error       *string  `json:"error"`
	CreatedAt   string   `json:"created_at"`
}

func DefaultTaxProfile() TaxProfile {
	return TaxProfile{
		LegalForm:                    LegalFormEenmanszaak,
		VatFilingFrequency:           VatFilingFrequencyQuarter,
		UsesKOR:                      false,
		MeetsHoursCriterion:          nil,
		IsStarter:                    false,
		ReachedAOWAge:                false,
		OtherBox1Income:              nil,
		ProvisionalAssessmentMonthly: nil,
		AccountantName:               nil,
		AccountantEmail:              nil,
		DefaultExportFormats:         []string{"xlsx", "receipts_zip"},
		UpdatedAt:                    time.Now().UTC().Format(time.RFC3339),
	}
}

