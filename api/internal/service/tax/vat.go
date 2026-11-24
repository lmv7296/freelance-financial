package tax

import (
	"fmt"
	"math"
	"time"

	"go-freelancer/internal/model"
)

type VatPeriodResult struct {
	Periods  []model.VatPeriod
	Warnings []model.TaxWarning
}

// CalculateVatPeriods generates VAT rubrieken and periods for a tax year
func CalculateVatPeriods(
	taxYear int,
	frequency model.VatFilingFrequency,
	usesKOR bool,
	invoices []*model.Invoice,
	approvedExpenses []*model.Expense,
	now time.Time,
) VatPeriodResult {
	var warnings []model.TaxWarning

	// Calculate total turnover for KOR check
	var totalTurnoverCents int64
	for _, inv := range invoices {
		totalTurnoverCents += inv.SubtotalCents
	}

	if usesKOR {
		if totalTurnoverCents > 2000000 { // €20,000 threshold
			warnings = append(warnings, model.TaxWarning{
				Code:     "kor_threshold_exceeded",
				Severity: "critical",
				Message:  "Uw omzet overschrijdt de KOR-omzetgrens van € 20.000. U dient zich mogelijk af te melden voor de KOR.",
			})
		}
		return VatPeriodResult{
			Periods:  []model.VatPeriod{},
			Warnings: warnings,
		}
	}

	type periodDef struct {
		key       string
		label     string
		startDate time.Time
		endDate   time.Time
		deadline  time.Time
	}

	var periods []periodDef

	switch frequency {
	case model.VatFilingFrequencyMonth:
		for m := 1; m <= 12; m++ {
			start := time.Date(taxYear, time.Month(m), 1, 0, 0, 0, 0, time.UTC)
			end := start.AddDate(0, 1, -1)
			// Deadline: last day of following month
			deadline := time.Date(taxYear, time.Month(m+1), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 1, -1)
			periods = append(periods, periodDef{
				key:       fmt.Sprintf("%d-M%02d", taxYear, m),
				label:     fmt.Sprintf("%s %d", start.Format("January"), taxYear),
				startDate: start,
				endDate:   end,
				deadline:  deadline,
			})
		}
	case model.VatFilingFrequencyYear:
		start := time.Date(taxYear, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(taxYear, 12, 31, 0, 0, 0, 0, time.UTC)
		deadline := time.Date(taxYear+1, 1, 31, 0, 0, 0, 0, time.UTC)
		periods = append(periods, periodDef{
			key:       fmt.Sprintf("%d", taxYear),
			label:     fmt.Sprintf("Jaar %d", taxYear),
			startDate: start,
			endDate:   end,
			deadline:  deadline,
		})
	default: // Quarter
		for q := 1; q <= 4; q++ {
			startMonth := (q-1)*3 + 1
			start := time.Date(taxYear, time.Month(startMonth), 1, 0, 0, 0, 0, time.UTC)
			end := start.AddDate(0, 3, -1)
			// Deadline: last day of month following quarter end
			deadline := time.Date(taxYear, time.Month(startMonth+3), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 1, -1)
			periods = append(periods, periodDef{
				key:       fmt.Sprintf("%d-Q%d", taxYear, q),
				label:     fmt.Sprintf("%de kwartaal %d", q, taxYear),
				startDate: start,
				endDate:   end,
				deadline:  deadline,
			})
		}
	}

	resultPeriods := make([]model.VatPeriod, 0, len(periods))

	for _, p := range periods {
		var rub1aTurnover, rub1aVat int64
		var rub1bTurnover, rub1bVat int64
		var rub1eTurnover int64
		var rub2aTurnover, rub2aVat int64
		var inputVat5b int64

		// Invoices in period
		for _, inv := range invoices {
			if inv.IssueDate == "" {
				continue
			}
			invDate, err := time.Parse("2006-01-02", inv.IssueDate)
			if err != nil {
				continue
			}
			if (invDate.Equal(p.startDate) || invDate.After(p.startDate)) &&
				(invDate.Equal(p.endDate) || invDate.Before(p.endDate)) {
				// Categorize into rubrieken
				if inv.VatRate == 21.0 {
					rub1aTurnover += inv.SubtotalCents
					rub1aVat += inv.VatAmountCents
				} else if inv.VatRate == 9.0 {
					rub1bTurnover += inv.SubtotalCents
					rub1bVat += inv.VatAmountCents
				} else if inv.VatRate == 0.0 {
					rub1eTurnover += inv.SubtotalCents
				} else {
					rub1aTurnover += inv.SubtotalCents
					rub1aVat += inv.VatAmountCents
				}
			}
		}

		// Approved Expenses in period
		for _, exp := range approvedExpenses {
			if exp.ReceiptDate == nil || *exp.ReceiptDate == "" {
				continue
			}
			expDate, err := time.Parse("2006-01-02", *exp.ReceiptDate)
			if err != nil {
				continue
			}
			if (expDate.Equal(p.startDate) || expDate.After(p.startDate)) &&
				(expDate.Equal(p.endDate) || expDate.Before(p.endDate)) {
				if exp.VatAmount != nil {
					inputVat5b += int64(math.Round(*exp.VatAmount * 100))
				}
			}
		}

		vatDue5a := rub1aVat + rub1bVat + rub2aVat
		balance := vatDue5a - inputVat5b

		status := "open"
		isEstimate := false
		if now.Before(p.endDate) {
			isEstimate = true
			status = "open"
		} else if now.After(p.endDate) && now.Before(p.deadline) {
			status = "to_file"
		} else {
			status = "to_file"
		}

		toPtr := func(v float64) *float64 { return &v }
		rubrieken := []model.VatRubriek{
			{
				Code:     "1a",
				Label:    "Leveringen/diensten belast met 21%",
				Turnover: toPtr(centsToEuro(rub1aTurnover)),
				Vat:      toPtr(centsToEuro(rub1aVat)),
			},
			{
				Code:     "1b",
				Label:    "Leveringen/diensten belast met 9%",
				Turnover: toPtr(centsToEuro(rub1bTurnover)),
				Vat:      toPtr(centsToEuro(rub1bVat)),
			},
			{
				Code:     "1e",
				Label:    "Leveringen/diensten belast met 0% of niet bij u belast",
				Turnover: toPtr(centsToEuro(rub1eTurnover)),
				Vat:      toPtr(0),
			},
			{
				Code:     "2a",
				Label:    "Verleggingsregelingen binnenland (btw verlegd)",
				Turnover: toPtr(centsToEuro(rub2aTurnover)),
				Vat:      toPtr(centsToEuro(rub2aVat)),
			},
			{
				Code:     "5a",
				Label:    "Verschuldigde omzetbelasting (rubriek 1 t/m 4)",
				Turnover: nil,
				Vat:      toPtr(centsToEuro(vatDue5a)),
			},
			{
				Code:     "5b",
				Label:    "Voorbelasting (aftrekbare btw op goedgekeurde uitgaven)",
				Turnover: nil,
				Vat:      toPtr(centsToEuro(inputVat5b)),
			},
		}

		resultPeriods = append(resultPeriods, model.VatPeriod{
			Key:        p.key,
			Label:      p.label,
			StartDate:  p.startDate.Format("2006-01-02"),
			EndDate:    p.endDate.Format("2006-01-02"),
			Deadline:   p.deadline.Format("2006-01-02"),
			Status:     status,
			IsEstimate: isEstimate,
			VatDue:     centsToEuro(vatDue5a),
			InputVat:   centsToEuro(inputVat5b),
			Balance:    centsToEuro(balance),
			Rubrieken:  rubrieken,
		})
	}

	return VatPeriodResult{
		Periods:  resultPeriods,
		Warnings: warnings,
	}
}

func centsToEuro(cents int64) float64 {
	return math.Round(float64(cents)) / 100.0
}
