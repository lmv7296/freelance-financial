package report_test

import (
	"bytes"
	"context"
	"strings"
	"testing"
	"time"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
	"go-freelancer/internal/service/report"
	"go-freelancer/internal/service/tax"
)

func TestParsePeriod(t *testing.T) {
	tests := []struct {
		name          string
		from          string
		to            string
		expectedSlug  string
		isWholePeriod bool
	}{
		{
			name:          "Whole Year",
			from:          "2026-01-01",
			to:            "2026-12-31",
			expectedSlug:  "2026",
			isWholePeriod: true,
		},
		{
			name:          "Quarter 1",
			from:          "2026-01-01",
			to:            "2026-03-31",
			expectedSlug:  "2026-Q1",
			isWholePeriod: true,
		},
		{
			name:          "Quarter 3",
			from:          "2026-07-01",
			to:            "2026-09-30",
			expectedSlug:  "2026-Q3",
			isWholePeriod: true,
		},
		{
			name:          "Whole Month July",
			from:          "2026-07-01",
			to:            "2026-07-31",
			expectedSlug:  "2026-07",
			isWholePeriod: true,
		},
		{
			name:          "Custom Range",
			from:          "2026-07-01",
			to:            "2026-08-15",
			expectedSlug:  "2026-07-01_2026-08-15",
			isWholePeriod: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			p, err := report.ParsePeriod(tc.from, tc.to)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if p.PeriodSlug != tc.expectedSlug {
				t.Errorf("expected slug %s, got %s", tc.expectedSlug, p.PeriodSlug)
			}
			if p.IsWholePeriod != tc.isWholePeriod {
				t.Errorf("expected isWholePeriod %v, got %v", tc.isWholePeriod, p.IsWholePeriod)
			}
		})
	}

	// From after To error test
	_, err := report.ParsePeriod("2026-10-01", "2026-09-01")
	if err == nil {
		t.Errorf("expected error for from after to, got nil")
	}
}

func TestBuildProfitLossData_FiltersCorrectly(t *testing.T) {
	p, _ := report.ParsePeriod("2026-07-01", "2026-09-30")

	invoices := []*model.Invoice{
		{
			ID:            "inv_1",
			InvoiceNumber: "INV-1",
			IssueDate:     "2026-08-01",
			Status:        model.InvoiceStatusSent,
			SubtotalCents: 100000, // €1000
			VatAmountCents: 21000, // €210
			TotalCents:    121000,
			Currency:      "EUR",
		},
		{
			ID:            "inv_draft",
			InvoiceNumber: "INV-DRAFT",
			IssueDate:     "2026-08-05",
			Status:        model.InvoiceStatusDraft, // Should be omitted
			SubtotalCents: 50000,
			TotalCents:    60500,
			Currency:      "EUR",
		},
		{
			ID:            "inv_cancelled",
			InvoiceNumber: "INV-CANCELLED",
			IssueDate:     "2026-08-10",
			Status:        model.InvoiceStatusCancelled, // Should be omitted
			SubtotalCents: 80000,
			TotalCents:    96800,
			Currency:      "EUR",
		},
		{
			ID:            "inv_usd",
			InvoiceNumber: "INV-USD",
			IssueDate:     "2026-08-15",
			Status:        model.InvoiceStatusSent,
			SubtotalCents: 20000,
			TotalCents:    24200,
			Currency:      "USD", // Non-EUR: should be excluded from totals and in warning list
		},
	}

	rDate := "2026-08-12"
	cat := "Software & Tools"
	sub := 200.0
	vat := 42.0
	expenses := []*model.Expense{
		{
			ID:             "exp_1",
			MerchantName:   "GitHub",
			ReceiptDate:    &rDate,
			Status:         model.ExpenseStatusApproved,
			Category:       &cat,
			SubtotalAmount: &sub,
			VatAmount:      &vat,
			TotalAmount:    242.0,
			Currency:       "EUR",
		},
		{
			ID:           "exp_unreviewed",
			MerchantName: "Pending Store",
			ReceiptDate:  &rDate,
			Status:       model.ExpenseStatusNeedsReview, // Should be omitted from numbers, counted in unreviewed
			TotalAmount:  100.0,
			Currency:     "EUR",
		},
		{
			ID:           "exp_rejected",
			MerchantName: "Bad Store",
			ReceiptDate:  &rDate,
			Status:       model.ExpenseStatusRejected, // Should be completely omitted
			TotalAmount:  300.0,
			Currency:     "EUR",
		},
	}

	data := report.BuildProfitLossData(p, invoices, expenses)

	if data.RevenueExclVatCents != 100000 {
		t.Errorf("expected revenue excl vat 100000, got %d", data.RevenueExclVatCents)
	}
	if data.TotalCostsExclVatCents != 20000 {
		t.Errorf("expected costs excl vat 20000, got %d", data.TotalCostsExclVatCents)
	}
	if data.NetResultCents != 80000 { // €1000 - €200 = €800
		t.Errorf("expected net result 80000, got %d", data.NetResultCents)
	}
	if data.UnreviewedExpensesCount != 1 {
		t.Errorf("expected 1 unreviewed expense, got %d", data.UnreviewedExpensesCount)
	}
	if len(data.NonEurInvoices) != 1 {
		t.Errorf("expected 1 non-EUR invoice, got %d", len(data.NonEurInvoices))
	}
}

func TestReportService_EndToEnd(t *testing.T) {
	ctx := context.Background()
	companyRepo := repository.NewMemoryCompanyRepository()
	invoiceRepo := repository.NewMemoryClientInvoiceRepository()
	expenseRepo := repository.NewMemoryExpenseRepository("./uploads/receipts")
	taxVaultRepo := repository.NewMemoryTaxVaultRepository(companyRepo)

	companyID := "comp_test_123"
	compName := "De Vries Bouw & Montage"
	kvk := "12345678"
	vat := "NL123456789B01"
	_ = companyRepo.Create(ctx, &model.Company{
		ID:        companyID,
		Name:      &compName,
		KVKNumber: &kvk,
		VATNumber: &vat,
		Country:   "NL",
	})

	// Add an invoice
	_ = invoiceRepo.CreateInvoice(ctx, &model.Invoice{
		ID:             "inv_1",
		CompanyID:      companyID,
		InvoiceNumber:  "INV-2026-001",
		IssueDate:      "2026-08-10",
		DueDate:        "2026-09-10",
		Status:         model.InvoiceStatusSent,
		SubtotalCents:  150000,
		VatRate:        21.0,
		VatAmountCents: 31500,
		TotalCents:     181500,
		Currency:       "EUR",
	})

	// Add an expense
	rDate := "2026-08-15"
	cat := "Gereedschap"
	sub := 300.0
	vatAmt := 63.0
	_ = expenseRepo.Create(ctx, &model.Expense{
		ID:             "exp_1",
		CompanyID:      companyID,
		MerchantName:   "Bouwmaat",
		ReceiptDate:    &rDate,
		Status:         model.ExpenseStatusApproved,
		Category:       &cat,
		SubtotalAmount: &sub,
		VatAmount:      &vatAmt,
		TotalAmount:    363.0,
		Currency:       "EUR",
	})

	svc := report.NewReportService(companyRepo, invoiceRepo, expenseRepo, taxVaultRepo)

	// 1. GetOptions
	options, err := svc.GetOptions(ctx, companyID)
	if err != nil {
		t.Fatalf("GetOptions failed: %v", err)
	}
	if len(options.Reports) != 4 {
		t.Errorf("expected 4 reports, got %d", len(options.Reports))
	}
	if len(options.AvailableYears) == 0 || options.AvailableYears[0] != 2026 {
		t.Errorf("expected available years to contain 2026, got %v", options.AvailableYears)
	}

	// 2. Generate PDF Profit & Loss
	pName, pType, pBytes, err := svc.GenerateReport(ctx, companyID, model.ReportParams{
		Key:    model.ReportKeyProfitLoss,
		Format: model.ReportFormatPDF,
		From:   "2026-07-01",
		To:     "2026-09-30",
		Lang:   "nl",
	})
	if err != nil {
		t.Fatalf("GenerateReport PDF failed: %v", err)
	}
	if pName != "winst-en-verlies_2026-Q3.pdf" {
		t.Errorf("expected filename winst-en-verlies_2026-Q3.pdf, got %s", pName)
	}
	if pType != "application/pdf" {
		t.Errorf("expected application/pdf, got %s", pType)
	}
	if !bytes.HasPrefix(pBytes, []byte("%PDF")) {
		t.Errorf("expected PDF header magic bytes")
	}

	// 3. Generate Excel Invoices
	xName, xType, xBytes, err := svc.GenerateReport(ctx, companyID, model.ReportParams{
		Key:    model.ReportKeyInvoices,
		Format: model.ReportFormatXLSX,
		From:   "2026-07-01",
		To:     "2026-09-30",
		Lang:   "en",
	})
	if err != nil {
		t.Fatalf("GenerateReport XLSX failed: %v", err)
	}
	if xName != "invoices-and-open-items_2026-Q3.xlsx" {
		t.Errorf("expected filename invoices-and-open-items_2026-Q3.xlsx, got %s", xName)
	}
	if xType != "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" {
		t.Errorf("expected excel content type, got %s", xType)
	}
	if len(xBytes) == 0 {
		t.Errorf("expected non-empty xlsx bytes")
	}

	// 4. VAT summary gives exact parity with Tax Vault
	vName, _, _, err := svc.GenerateReport(ctx, companyID, model.ReportParams{
		Key:    model.ReportKeyVatSummary,
		Format: model.ReportFormatPDF,
		From:   "2026-07-01",
		To:     "2026-09-30",
		Lang:   "nl",
	})
	if err != nil {
		t.Fatalf("Generate VAT report failed: %v", err)
	}
	if vName != "btw-overzicht_2026-Q3.pdf" {
		t.Errorf("expected btw-overzicht_2026-Q3.pdf, got %s", vName)
	}

	// Direct calculation comparison with Tax Vault
	invoicesList, _ := invoiceRepo.ListInvoices(ctx, companyID, nil)
	expensesList, _ := expenseRepo.List(ctx, companyID, nil, nil)
	taxVaultVat := tax.CalculateVatPeriods(2026, model.VatFilingFrequencyQuarter, false, invoicesList, expensesList, time.Now().UTC())

	foundQ3 := false
	for _, p := range taxVaultVat.Periods {
		if p.Key == "2026-Q3" {
			foundQ3 = true
			if p.VatDue != 315.0 { // 21% of €1500
				t.Errorf("expected VatDue 315.0, got %v", p.VatDue)
			}
			if p.InputVat != 63.0 { // €63
				t.Errorf("expected InputVat 63.0, got %v", p.InputVat)
			}
			if p.Balance != 252.0 { // €315 - €63 = €252
				t.Errorf("expected Balance 252.0, got %v", p.Balance)
			}
		}
	}
	if !foundQ3 {
		t.Errorf("Q3 not found in Tax Vault periods")
	}

	// 5. Empty period test
	_, _, emptyBytes, err := svc.GenerateReport(ctx, companyID, model.ReportParams{
		Key:    model.ReportKeyProfitLoss,
		Format: model.ReportFormatPDF,
		From:   "2025-01-01",
		To:     "2025-03-31",
		Lang:   "nl",
	})
	if err != nil {
		t.Fatalf("expected 200 with file for empty period, got err: %v", err)
	}
	if len(emptyBytes) == 0 {
		t.Errorf("expected file bytes for empty period")
	}

	// 6. Validation tests
	// Invalid format
	_, _, _, err = svc.GenerateReport(ctx, companyID, model.ReportParams{
		Key:    model.ReportKeyProfitLoss,
		Format: "docx",
		From:   "2026-07-01",
		To:     "2026-09-30",
	})
	if err == nil || !strings.Contains(err.Error(), "invalid format") {
		t.Errorf("expected invalid format error, got %v", err)
	}

	// Unknown report key -> 404
	_, _, _, err = svc.GenerateReport(ctx, companyID, model.ReportParams{
		Key:    "non_existent_report",
		Format: model.ReportFormatPDF,
		From:   "2026-07-01",
		To:     "2026-09-30",
	})
	if !strings.Contains(err.Error(), "report not found") {
		t.Errorf("expected report not found error, got %v", err)
	}

	// Custom range for vat_summary -> 422
	_, _, _, err = svc.GenerateReport(ctx, companyID, model.ReportParams{
		Key:    model.ReportKeyVatSummary,
		Format: model.ReportFormatPDF,
		From:   "2026-07-01",
		To:     "2026-08-15",
	})
	if err == nil || !strings.Contains(err.Error(), "vat_summary requires a whole month") {
		t.Errorf("expected whole period error for vat_summary, got %v", err)
	}
}

