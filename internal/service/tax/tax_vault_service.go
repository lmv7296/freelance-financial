package tax

import (
	"context"
	"fmt"
	"math"
	"time"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
)

type TaxVaultService struct {
	repo         repository.TaxVaultRepository
	expenseRepo  repository.ExpenseRepository
	invoiceRepo  repository.ClientInvoiceRepository
	eenmanszaak  TaxCalculator
}

func NewTaxVaultService(
	repo repository.TaxVaultRepository,
	expenseRepo repository.ExpenseRepository,
	invoiceRepo repository.ClientInvoiceRepository,
) *TaxVaultService {
	return &TaxVaultService{
		repo:        repo,
		expenseRepo: expenseRepo,
		invoiceRepo: invoiceRepo,
		eenmanszaak: NewEenmanszaakCalculator(),
	}
}

func (s *TaxVaultService) GetTaxProfile(ctx context.Context, companyID string) (*model.TaxProfile, error) {
	return s.repo.GetTaxProfile(ctx, companyID)
}

func (s *TaxVaultService) UpdateTaxProfile(ctx context.Context, companyID string, profile model.TaxProfile) (*model.TaxProfile, error) {
	if err := s.repo.SaveTaxProfile(ctx, companyID, profile); err != nil {
		return nil, err
	}
	return s.repo.GetTaxProfile(ctx, companyID)
}

func (s *TaxVaultService) GetOverview(ctx context.Context, companyID string, year int) (*model.TaxVaultOverview, error) {
	profile, err := s.repo.GetTaxProfile(ctx, companyID)
	if err != nil {
		return nil, fmt.Errorf("get profile: %w", err)
	}

	availableYears, err := s.repo.GetAvailableTaxYears(ctx)
	if err != nil {
		return nil, fmt.Errorf("get available years: %w", err)
	}

	legalFormStr := string(profile.LegalForm)
	rules, err := s.repo.GetTaxRules(ctx, year, &legalFormStr)
	if err != nil {
		return nil, fmt.Errorf("get rules: %w", err)
	}

	// Fetch invoices & expenses
	invoices, err := s.invoiceRepo.ListInvoices(ctx, companyID, nil)
	if err != nil {
		return nil, fmt.Errorf("list invoices: %w", err)
	}

	expenses, err := s.expenseRepo.List(ctx, companyID, nil, nil)
	if err != nil {
		return nil, fmt.Errorf("list expenses: %w", err)
	}

	// Filter by year. Drafts and cancelled invoices aren't revenue and carry no
	// VAT, the same rule the reports use.
	var yearInvoices []*model.Invoice
	var revExclVatCents int64
	for _, inv := range invoices {
		if inv.Status == model.InvoiceStatusDraft || inv.Status == model.InvoiceStatusCancelled {
			continue
		}
		if len(inv.IssueDate) >= 4 && inv.IssueDate[:4] == fmt.Sprintf("%04d", year) {
			yearInvoices = append(yearInvoices, inv)
			revExclVatCents += inv.SubtotalCents
		}
	}

	var approvedExpenses []*model.Expense
	var expExclVatCents int64
	unreviewedCount := 0

	for _, exp := range expenses {
		if exp.ReceiptDate != nil && len(*exp.ReceiptDate) >= 4 && (*exp.ReceiptDate)[:4] == fmt.Sprintf("%04d", year) {
			if exp.Status == model.ExpenseStatusApproved {
				approvedExpenses = append(approvedExpenses, exp)
				if exp.SubtotalAmount != nil {
					expExclVatCents += int64(math.Round(*exp.SubtotalAmount * 100))
				} else {
					expExclVatCents += int64(math.Round(exp.TotalAmount * 100))
				}
			} else if exp.Status == model.ExpenseStatusNeedsReview {
				unreviewedCount++
			}
		}
	}

	profitCents := revExclVatCents - expExclVatCents
	now := time.Now().UTC()
	currentMonth := int(now.Month())
	if now.Year() != year {
		if now.Year() > year {
			currentMonth = 12
		} else {
			currentMonth = 1
		}
	}

	// VAT Calculation
	vatRes := CalculateVatPeriods(year, profile.VatFilingFrequency, profile.UsesKOR, yearInvoices, approvedExpenses, now)

	// Income Tax Calculation
	var incomeTaxEst *model.IncomeTaxEstimate
	var rulesUsed []model.TaxRuleUsed
	var calcWarnings []model.TaxWarning

	if profile.LegalForm != model.LegalFormEenmanszaak {
		unavailableMethod := "Geen berekening beschikbaar voor deze rechtsvorm"
		incomeTaxEst = &model.IncomeTaxEstimate{
			Status:           "unavailable",
			Kind:             string(profile.LegalForm),
			Label:            fmt.Sprintf("Inkomstenbelasting / VPB (%s)", string(profile.LegalForm)),
			ProjectionMethod: &unavailableMethod,
			ToDate:           nil,
			Projected:        nil,
		}
		calcWarnings = append(calcWarnings, model.TaxWarning{
			Code:     "unsupported_legal_form",
			Severity: "warning",
			Message:  fmt.Sprintf("De automatische belastingberekening ondersteunt momenteel alleen de eenmanszaak. Voor de rechtsvorm '%s' is nog geen automatische berekening beschikbaar.", string(profile.LegalForm)),
		})
	} else {
		var provPaidCents int64 = 0
		if profile.ProvisionalAssessmentMonthly != nil {
			provPaidCents = int64(math.Round(*profile.ProvisionalAssessmentMonthly * 100 * float64(currentMonth)))
		}

		var calculator TaxCalculator = s.eenmanszaak
		var err error
		incomeTaxEst, rulesUsed, calcWarnings, err = calculator.Calculate(
			ctx,
			profile,
			rules,
			revExclVatCents,
			expExclVatCents,
			currentMonth,
			provPaidCents,
		)
		if err != nil {
			return nil, fmt.Errorf("calculate income tax: %w", err)
		}
	}

	// Warnings
	allWarnings := append([]model.TaxWarning{}, vatRes.Warnings...)
	allWarnings = append(allWarnings, calcWarnings...)
	if unreviewedCount > 0 {
		allWarnings = append(allWarnings, model.TaxWarning{
			Code:     "unreviewed_expenses",
			Severity: "warning",
			Message:  fmt.Sprintf("Er zijn nog %d uitgaven die beoordeeld moeten worden. Deze zijn niet meegenomen in de berekening.", unreviewedCount),
		})
	}

	// Set-aside advice
	var setAside *model.SetAsideAdvice
	if incomeTaxEst != nil && incomeTaxEst.Projected != nil {
		monthsRemaining := 12 - currentMonth
		if monthsRemaining <= 0 {
			monthsRemaining = 1
		}
		stillToPay := incomeTaxEst.Projected.StillToPay
		monthlyAmount := 0.0
		if stillToPay > 0 {
			monthlyAmount = math.Round((stillToPay/float64(monthsRemaining))*100) / 100.0
		}
		setAside = &model.SetAsideAdvice{
			MonthlyAmount:   monthlyAmount,
			MonthsRemaining: monthsRemaining,
			Components:      incomeTaxEst.Projected.Components,
			Explanation: fmt.Sprintf(
				"Advies om maandelijks € %.2f opzij te zetten gedurende de resterende %d maanden van %d.",
				monthlyAmount, monthsRemaining, year,
			),
		}
	}

	// Deadlines
	deadlines := make([]model.TaxDeadline, 0)
	// Add VAT deadlines
	for _, vp := range vatRes.Periods {
		dlDate, err := time.Parse("2006-01-02", vp.Deadline)
		if err != nil {
			continue
		}
		status := "upcoming"
		if now.After(dlDate) {
			status = "overdue"
		} else if dlDate.Sub(now) < 14*24*time.Hour {
			status = "due_soon"
		}
		amount := vp.Balance
		deadlines = append(deadlines, model.TaxDeadline{
			Key:         fmt.Sprintf("vat-%s", vp.Key),
			Date:        vp.Deadline,
			Type:        "vat_return",
			Label:       fmt.Sprintf("Btw-aangifte & betaling %s", vp.Label),
			Description: nil,
			Status:      status,
			Amount:      &amount,
			SourceURL:   nil,
		})
	}

	// Add Income Tax Deadline (1 May of year + 1)
	ibDeadline := fmt.Sprintf("%d-05-01", year+1)
	deadlines = append(deadlines, model.TaxDeadline{
		Key:         fmt.Sprintf("ib-%d", year),
		Date:        ibDeadline,
		Type:        "income_tax_return",
		Label:       fmt.Sprintf("Aangifte inkomstenbelasting %d", year),
		Description: nil,
		Status:      "upcoming",
		Amount:      nil,
		SourceURL:   nil,
	})

	profileComplete := profile.MeetsHoursCriterion != nil

	return &model.TaxVaultOverview{
		TaxYear:         year,
		AvailableYears:  availableYears,
		LegalForm:       profile.LegalForm,
		GeneratedAt:     now.Format(time.RFC3339),
		ProfileComplete: profileComplete,
		Totals: model.TaxVaultTotals{
			RevenueExclVat:          centsToEuro(revExclVatCents),
			ExpensesExclVat:         centsToEuro(expExclVatCents),
			Profit:                  centsToEuro(profitCents),
			UnreviewedExpensesCount: unreviewedCount,
		},
		Vat: model.TaxVaultVatOverview{
			Enabled: !profile.UsesKOR,
			Periods: vatRes.Periods,
		},
		IncomeTax: *incomeTaxEst,
		SetAside:  setAside,
		Deadlines: deadlines,
		Warnings:  allWarnings,
		RulesUsed: rulesUsed,
	}, nil
}

func (s *TaxVaultService) GetExportOptions() []model.ExportFormatOption {
	return []model.ExportFormatOption{
		{Key: "xlsx", Label: "Excel-werkmap (.xlsx)", Description: "Volledig overzicht van omzet, kosten en btw per kwartaal"},
		{Key: "csv", Label: "CSV-bestanden (.csv)", Description: "Kommagescheiden export voor import in boekhoudpakketten"},
		{Key: "pdf_summary", Label: "PDF Samenvatting (.pdf)", Description: "Overzichtelijk rapport voor de belastingaangifte"},
		{Key: "receipts_zip", Label: "Bonnenarchief (.zip)", Description: "Alle gekoppelde bonnetjes en facturen in één ZIP-bestand"},
		{Key: "xaf", Label: "Auditfile Financieel (.xaf)", Description: "Standaard XML-formaat voor de Belastingdienst en accountants"},
	}
}

func (s *TaxVaultService) GetTaxExports(ctx context.Context, companyID string, year int) ([]model.TaxExport, error) {
	return s.repo.GetTaxExports(ctx, companyID, year)
}

func (s *TaxVaultService) CreateTaxExport(ctx context.Context, companyID string, req model.CreateTaxExportRequest) (*model.TaxExport, error) {
	id := fmt.Sprintf("exp-%d", time.Now().UnixNano())
	now := time.Now().UTC().Format(time.RFC3339)

	var sentTo *string
	if req.SendToAccountant {
		profile, _ := s.repo.GetTaxProfile(ctx, companyID)
		if profile != nil && profile.AccountantEmail != nil {
			sentTo = profile.AccountantEmail
		}
	}

	periodLabel := req.PeriodKey
	if req.PeriodKey == "year" {
		periodLabel = fmt.Sprintf("Heel kalenderjaar %d", req.TaxYear)
	}

	exp := model.TaxExport{
		ID:          id,
		TaxYear:     req.TaxYear,
		PeriodKey:   req.PeriodKey,
		PeriodLabel: periodLabel,
		Formats:     req.Formats,
		Status:      "pending",
		DownloadURL: nil,
		SentTo:      sentTo,
		Error:       nil,
		CreatedAt:   now,
	}

	if err := s.repo.CreateTaxExport(ctx, exp, companyID); err != nil {
		return nil, err
	}

	if req.SaveAsDefault {
		profile, err := s.repo.GetTaxProfile(ctx, companyID)
		if err == nil && profile != nil {
			profile.DefaultExportFormats = req.Formats
			_ = s.repo.SaveTaxProfile(ctx, companyID, *profile)
		}
	}

	// Trigger asynchronous background export job
	go s.generateExportAsync(companyID, exp)

	return &exp, nil
}

func (s *TaxVaultService) generateExportAsync(companyID string, exp model.TaxExport) {
	// Simulate generation (or real file writing)
	time.Sleep(500 * time.Millisecond)

	downloadURL := fmt.Sprintf("/api/v1/tax-vault/exports/%s/download", exp.ID)
	exp.Status = "ready"
	exp.DownloadURL = &downloadURL

	_ = s.repo.UpdateTaxExport(context.Background(), exp)
}
