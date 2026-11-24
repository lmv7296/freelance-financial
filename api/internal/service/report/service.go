package report

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
	"go-freelancer/internal/service/tax"
)

var (
	ErrReportNotFound = errors.New("report not found")
	ErrInvalidParams  = errors.New("invalid report parameters")
)

// ReportService defines the interface for generating report options and files.
type ReportService interface {
	GetOptions(ctx context.Context, companyID string) (*model.ReportOptions, error)
	GenerateReport(ctx context.Context, companyID string, params model.ReportParams) (filename string, contentType string, data []byte, err error)
}

type reportService struct {
	companyRepo  repository.CompanyRepository
	invoiceRepo  repository.ClientInvoiceRepository
	expenseRepo  repository.ExpenseRepository
	taxVaultRepo repository.TaxVaultRepository
}

func NewReportService(
	companyRepo repository.CompanyRepository,
	invoiceRepo repository.ClientInvoiceRepository,
	expenseRepo repository.ExpenseRepository,
	taxVaultRepo repository.TaxVaultRepository,
) ReportService {
	return &reportService{
		companyRepo:  companyRepo,
		invoiceRepo:  invoiceRepo,
		expenseRepo:  expenseRepo,
		taxVaultRepo: taxVaultRepo,
	}
}

func (s *reportService) GetOptions(ctx context.Context, companyID string) (*model.ReportOptions, error) {
	invoices, err := s.invoiceRepo.ListInvoices(ctx, companyID, nil)
	if err != nil {
		return nil, fmt.Errorf("list invoices for options: %w", err)
	}

	expenses, err := s.expenseRepo.List(ctx, companyID, nil, nil)
	if err != nil {
		return nil, fmt.Errorf("list expenses for options: %w", err)
	}

	yearMap := make(map[int]bool)
	currYear := time.Now().Year()
	yearMap[currYear] = true

	for _, inv := range invoices {
		if len(inv.IssueDate) >= 4 {
			var y int
			if _, err := fmt.Sscanf(inv.IssueDate[:4], "%d", &y); err == nil && y > 2000 {
				yearMap[y] = true
			}
		}
	}

	for _, exp := range expenses {
		if exp.ReceiptDate != nil && len(*exp.ReceiptDate) >= 4 {
			var y int
			if _, err := fmt.Sscanf((*exp.ReceiptDate)[:4], "%d", &y); err == nil && y > 2000 {
				yearMap[y] = true
			}
		}
	}

	years := make([]int, 0, len(yearMap))
	for y := range yearMap {
		years = append(years, y)
	}
	sort.Slice(years, func(i, j int) bool {
		return years[i] > years[j] // newest first
	})

	reports := []model.ReportItem{
		{
			Key:     model.ReportKeyProfitLoss,
			Formats: []model.ReportFormat{model.ReportFormatPDF, model.ReportFormatXLSX},
		},
		{
			Key:     model.ReportKeyVatSummary,
			Formats: []model.ReportFormat{model.ReportFormatPDF, model.ReportFormatXLSX},
		},
		{
			Key:     model.ReportKeyInvoices,
			Formats: []model.ReportFormat{model.ReportFormatPDF, model.ReportFormatXLSX},
		},
		{
			Key:     model.ReportKeyExpenses,
			Formats: []model.ReportFormat{model.ReportFormatPDF, model.ReportFormatXLSX},
		},
	}

	return &model.ReportOptions{
		Reports:        reports,
		AvailableYears: years,
	}, nil
}

func (s *reportService) GenerateReport(
	ctx context.Context,
	companyID string,
	params model.ReportParams,
) (string, string, []byte, error) {
	// 1. Validate report key
	switch params.Key {
	case model.ReportKeyProfitLoss, model.ReportKeyVatSummary, model.ReportKeyInvoices, model.ReportKeyExpenses:
		// Valid
	default:
		return "", "", nil, ErrReportNotFound
	}

	// 2. Validate format
	if params.Format != model.ReportFormatPDF && params.Format != model.ReportFormatXLSX {
		return "", "", nil, fmt.Errorf("%w: invalid format '%s', must be 'pdf' or 'xlsx'", ErrInvalidParams, params.Format)
	}

	// 3. Validate lang
	lang := strings.ToLower(params.Lang)
	if lang == "" {
		lang = "nl"
	}
	if lang != "nl" && lang != "en" {
		return "", "", nil, fmt.Errorf("%w: invalid lang '%s', must be 'nl' or 'en'", ErrInvalidParams, params.Lang)
	}
	params.Lang = lang

	// 4. Validate date range
	period, err := ParsePeriod(params.From, params.To)
	if err != nil {
		return "", "", nil, fmt.Errorf("%w: %s", ErrInvalidParams, err.Error())
	}

	// 5. Special check for vat_summary: must be a whole period (month, quarter, year)
	if params.Key == model.ReportKeyVatSummary && !period.IsWholePeriod {
		return "", "", nil, fmt.Errorf("%w: vat_summary requires a whole month, quarter, or year", ErrInvalidParams)
	}

	// 6. Fetch company
	comp, err := s.companyRepo.GetByID(ctx, companyID)
	if err != nil && !errors.Is(err, repository.ErrCompanyNotFound) {
		return "", "", nil, fmt.Errorf("get company: %w", err)
	}

	// 7. Fetch invoices and expenses for this company
	invoices, err := s.invoiceRepo.ListInvoices(ctx, companyID, nil)
	if err != nil {
		return "", "", nil, fmt.Errorf("list invoices: %w", err)
	}

	expenses, err := s.expenseRepo.List(ctx, companyID, nil, nil)
	if err != nil {
		return "", "", nil, fmt.Errorf("list expenses: %w", err)
	}

	filename := BuildFileName(params.Key, period.PeriodSlug, params.Format, params.Lang)
	contentType := "application/pdf"
	if params.Format == model.ReportFormatXLSX {
		contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	}

	pdfBuilder := NewPDFBuilder(comp, params.Lang)
	xlsxBuilder := NewXLSXBuilder(comp, params.Lang)

	var fileBytes []byte

	switch params.Key {
	case model.ReportKeyProfitLoss:
		data := BuildProfitLossData(period, invoices, expenses)
		if params.Format == model.ReportFormatPDF {
			fileBytes, err = pdfBuilder.BuildProfitLossPDF(data)
		} else {
			fileBytes, err = xlsxBuilder.BuildProfitLossXLSX(data)
		}

	case model.ReportKeyVatSummary:
		data, bErr := s.buildVatSummaryData(ctx, companyID, period, invoices, expenses)
		if bErr != nil {
			return "", "", nil, bErr
		}
		if params.Format == model.ReportFormatPDF {
			fileBytes, err = pdfBuilder.BuildVatSummaryPDF(data)
		} else {
			fileBytes, err = xlsxBuilder.BuildVatSummaryXLSX(data)
		}

	case model.ReportKeyInvoices:
		data := BuildInvoicesReportData(period, invoices)
		if params.Format == model.ReportFormatPDF {
			fileBytes, err = pdfBuilder.BuildInvoicesPDF(data)
		} else {
			fileBytes, err = xlsxBuilder.BuildInvoicesXLSX(data)
		}

	case model.ReportKeyExpenses:
		data := BuildExpensesReportData(period, expenses)
		if params.Format == model.ReportFormatPDF {
			fileBytes, err = pdfBuilder.BuildExpensesPDF(data)
		} else {
			fileBytes, err = xlsxBuilder.BuildExpensesXLSX(data)
		}
	}

	if err != nil {
		return "", "", nil, fmt.Errorf("generate %s report: %w", params.Key, err)
	}

	return filename, contentType, fileBytes, nil
}

func (s *reportService) buildVatSummaryData(
	ctx context.Context,
	companyID string,
	period *PeriodInfo,
	invoices []*model.Invoice,
	expenses []*model.Expense,
) (*VatSummaryData, error) {
	// 1. Fetch Tax Profile to check KOR and filing frequency
	var freq model.VatFilingFrequency = model.VatFilingFrequencyQuarter
	var usesKOR bool = false
	if s.taxVaultRepo != nil {
		profile, err := s.taxVaultRepo.GetTaxProfile(ctx, companyID)
		if err == nil && profile != nil {
			freq = profile.VatFilingFrequency
			usesKOR = profile.UsesKOR
		}
	}

	// Adjust frequency if user requested a specific month or year
	calcFreq := freq
	if period.PeriodSlug == fmt.Sprintf("%d", period.Year) {
		calcFreq = model.VatFilingFrequencyYear
	} else if strings.Contains(period.PeriodSlug, "-M") || (len(period.PeriodSlug) == 7 && period.PeriodSlug[4] == '-') {
		calcFreq = model.VatFilingFrequencyMonth
	} else if period.IsQuarter {
		calcFreq = model.VatFilingFrequencyQuarter
	}

	// Filter year invoices & approved expenses
	var yearInvoices []*model.Invoice
	var nonEurInvoices []*model.Invoice
	for _, inv := range invoices {
		if len(inv.IssueDate) >= 4 && inv.IssueDate[:4] == fmt.Sprintf("%04d", period.Year) {
			if inv.Status == model.InvoiceStatusDraft || inv.Status == model.InvoiceStatusCancelled {
				continue
			}
			if inv.Currency != "" && inv.Currency != "EUR" {
				nonEurInvoices = append(nonEurInvoices, inv)
				continue
			}
			yearInvoices = append(yearInvoices, inv)
		}
	}

	var approvedExpenses []*model.Expense
	var nonEurExpenses []*model.Expense
	unreviewedCount := 0
	for _, exp := range expenses {
		if exp.ReceiptDate != nil && len(*exp.ReceiptDate) >= 4 && (*exp.ReceiptDate)[:4] == fmt.Sprintf("%04d", period.Year) {
			rDate := *exp.ReceiptDate
			if rDate >= period.From && rDate <= period.To {
				if exp.Status == model.ExpenseStatusNeedsReview {
					unreviewedCount++
				}
			}
			if exp.Status == model.ExpenseStatusApproved {
				if exp.Currency != "" && exp.Currency != "EUR" {
					if rDate >= period.From && rDate <= period.To {
						nonEurExpenses = append(nonEurExpenses, exp)
					}
					continue
				}
				approvedExpenses = append(approvedExpenses, exp)
			}
		}
	}

	vatRes := tax.CalculateVatPeriods(period.Year, calcFreq, usesKOR, yearInvoices, approvedExpenses, time.Now().UTC())

	data := &VatSummaryData{
		Period:                  period,
		UsesKOR:                 usesKOR,
		Warnings:                vatRes.Warnings,
		UnreviewedExpensesCount: unreviewedCount,
		NonEurInvoices:          nonEurInvoices,
		NonEurExpenses:          nonEurExpenses,
	}

	// Match period or aggregate
	var targetPeriod *model.VatPeriod
	for _, vp := range vatRes.Periods {
		if vp.Key == period.PeriodSlug || (vp.StartDate == period.From && vp.EndDate == period.To) {
			targetPeriod = &vp
			break
		}
	}

	if targetPeriod != nil {
		data.Rubrieken = targetPeriod.Rubrieken
		data.VatDue5a = targetPeriod.VatDue
		data.InputVat5b = targetPeriod.InputVat
		data.Balance = targetPeriod.Balance
	} else if len(vatRes.Periods) > 0 {
		// Aggregate periods if full year was calculated across multiple subperiods
		rubMap := make(map[string]*model.VatRubriek)
		var vatDue, inputVat float64
		for _, vp := range vatRes.Periods {
			vatDue += vp.VatDue
			inputVat += vp.InputVat
			for _, r := range vp.Rubrieken {
				item, ok := rubMap[r.Code]
				if !ok {
					cp := r
					rubMap[r.Code] = &cp
				} else {
					if r.Turnover != nil {
						if item.Turnover == nil {
							val := *r.Turnover
							item.Turnover = &val
						} else {
							*item.Turnover += *r.Turnover
						}
					}
					if r.Vat != nil {
						if item.Vat == nil {
							val := *r.Vat
							item.Vat = &val
						} else {
							*item.Vat += *r.Vat
						}
					}
				}
			}
		}
		var rubList []model.VatRubriek
		codes := []string{"1a", "1b", "1e", "2a", "5a", "5b", "5c"}
		for _, c := range codes {
			if item, ok := rubMap[c]; ok {
				rubList = append(rubList, *item)
			}
		}
		data.Rubrieken = rubList
		data.VatDue5a = math.Round(vatDue*100) / 100
		data.InputVat5b = math.Round(inputVat*100) / 100
		data.Balance = math.Round((vatDue-inputVat)*100) / 100
	} else {
		data.IsEmpty = true
	}

	return data, nil
}