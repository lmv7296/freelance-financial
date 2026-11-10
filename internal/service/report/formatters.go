package report

import (
	"fmt"
	"math"
	"strings"

	"go-freelancer/internal/model"
)

// FormatCurrency formats cents into localized euro representation:
// NL: € 1.234,56 / € -1.234,56
// EN: €1,234.56 / -€1,234.56
func FormatCurrency(cents int64, lang string) string {
	isNeg := cents < 0
	absCents := cents
	if isNeg {
		absCents = -cents
	}

	euros := absCents / 100
	remainder := absCents % 100

	// Format thousands grouping
	euroStr := fmt.Sprintf("%d", euros)
	var formattedEuros string
	sep := "."
	decSep := ","
	if lang == "en" {
		sep = ","
		decSep = "."
	}

	n := len(euroStr)
	for i, r := range euroStr {
		if i > 0 && (n-i)%3 == 0 {
			formattedEuros += sep
		}
		formattedEuros += string(r)
	}

	numStr := fmt.Sprintf("%s%s%02d", formattedEuros, decSep, remainder)

	if lang == "en" {
		if isNeg {
			return fmt.Sprintf("-€%s", numStr)
		}
		return fmt.Sprintf("€%s", numStr)
	}

	// Default NL
	if isNeg {
		return fmt.Sprintf("€ -%s", numStr)
	}
	return fmt.Sprintf("€ %s", numStr)
}

// FormatFloatCurrency formats float amount into localized euro string.
func FormatFloatCurrency(amount float64, lang string) string {
	cents := int64(math.Round(amount * 100))
	return FormatCurrency(cents, lang)
}

// ReportSlug returns the file slug for the report and language.
func ReportSlug(key model.ReportKey, lang string) string {
	switch key {
	case model.ReportKeyProfitLoss:
		if lang == "en" {
			return "profit-and-loss"
		}
		return "winst-en-verlies"
	case model.ReportKeyVatSummary:
		if lang == "en" {
			return "vat-summary"
		}
		return "btw-overzicht"
	case model.ReportKeyInvoices:
		if lang == "en" {
			return "invoices-and-open-items"
		}
		return "facturen-en-openstaande-posten"
	case model.ReportKeyExpenses:
		if lang == "en" {
			return "expenses-by-category"
		}
		return "uitgaven-per-categorie"
	default:
		return string(key)
	}
}

// ReportTitle returns the printable display title for the report.
func ReportTitle(key model.ReportKey, lang string) string {
	switch key {
	case model.ReportKeyProfitLoss:
		if lang == "en" {
			return "Profit & loss"
		}
		return "Winst & verlies"
	case model.ReportKeyVatSummary:
		if lang == "en" {
			return "VAT summary"
		}
		return "Btw-overzicht"
	case model.ReportKeyInvoices:
		if lang == "en" {
			return "Invoices & open items"
		}
		return "Facturen & openstaande posten"
	case model.ReportKeyExpenses:
		if lang == "en" {
			return "Expenses by category"
		}
		return "Uitgaven per categorie"
	default:
		return string(key)
	}
}

// BuildFileName constructs the file name as specified in reports-backend.md.
// e.g. winst-en-verlies_2026-Q3.pdf
func BuildFileName(key model.ReportKey, periodSlug string, format model.ReportFormat, lang string) string {
	slug := ReportSlug(key, lang)
	ext := strings.ToLower(string(format))
	return fmt.Sprintf("%s_%s.%s", slug, periodSlug, ext)
}

