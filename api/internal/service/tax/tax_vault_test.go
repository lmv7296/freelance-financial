package tax_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
	"go-freelancer/internal/service/tax"
)

func setupTestTaxVault(t *testing.T) (*tax.TaxVaultService, repository.TaxVaultRepository) {
	vaultRepo := repository.NewMemoryTaxVaultRepository()
	expenseRepo := repository.NewMemoryExpenseRepository(t.TempDir())
	invoiceRepo := repository.NewMemoryClientInvoiceRepository()

	// Load 2026 rules from json
	jsonPath := "/Users/lorenzo/freelanc-financial/freelance-financial/docs/tax-rules-2026-nl.json"
	absPath, err := filepath.Abs(jsonPath)
	if err != nil {
		t.Fatalf("resolve path: %v", err)
	}

	rules, err := repository.LoadTaxRulesFromJSONFile(absPath)
	if err != nil {
		t.Fatalf("load rules: %v", err)
	}

	if err := vaultRepo.SeedTaxRules(context.Background(), rules); err != nil {
		t.Fatalf("seed rules: %v", err)
	}

	service := tax.NewTaxVaultService(vaultRepo, expenseRepo, invoiceRepo)
	return service, vaultRepo
}

func TestEenmanszaakTaxCalculation(t *testing.T) {
	service, _ := setupTestTaxVault(t)
	ctx := context.Background()

	// Set tax profile
	hoursTrue := true
	profile := model.TaxProfile{
		LegalForm:            model.LegalFormEenmanszaak,
		VatFilingFrequency:   model.VatFilingFrequencyQuarter,
		UsesKOR:              false,
		MeetsHoursCriterion:  &hoursTrue,
		IsStarter:            false,
		ReachedAOWAge:        false,
		DefaultExportFormats: []string{"xlsx"},
		UpdatedAt:            time.Now().Format(time.RFC3339),
	}

	if _, err := service.UpdateTaxProfile(ctx, "comp-123", profile); err != nil {
		t.Fatalf("update profile: %v", err)
	}

	overview, err := service.GetOverview(ctx, "comp-123", 2026)
	if err != nil {
		t.Fatalf("get overview: %v", err)
	}

	if overview.IncomeTax.Status != "available" {
		t.Fatalf("expected available status, got %s", overview.IncomeTax.Status)
	}

	if len(overview.RulesUsed) == 0 {
		t.Fatalf("expected rules used to be populated")
	}

	// Verify VAT periods
	if len(overview.Vat.Periods) != 4 {
		t.Fatalf("expected 4 quarters, got %d", len(overview.Vat.Periods))
	}
}

func TestVatPeriodsWithKOR(t *testing.T) {
	service, _ := setupTestTaxVault(t)
	ctx := context.Background()

	profile := model.TaxProfile{
		LegalForm:            model.LegalFormEenmanszaak,
		VatFilingFrequency:   model.VatFilingFrequencyQuarter,
		UsesKOR:              true,
		MeetsHoursCriterion:  nil,
		IsStarter:            false,
		ReachedAOWAge:        false,
		DefaultExportFormats: []string{"xlsx"},
		UpdatedAt:            time.Now().Format(time.RFC3339),
	}

	if _, err := service.UpdateTaxProfile(ctx, "comp-kor", profile); err != nil {
		t.Fatalf("update profile: %v", err)
	}

	overview, err := service.GetOverview(ctx, "comp-kor", 2026)
	if err != nil {
		t.Fatalf("get overview: %v", err)
	}

	if overview.Vat.Enabled {
		t.Fatalf("expected VAT disabled when using KOR")
	}
	if len(overview.Vat.Periods) != 0 {
		t.Fatalf("expected 0 VAT periods when using KOR, got %d", len(overview.Vat.Periods))
	}
}

func TestOverview_IgnoresDraftAndCancelledInvoices(t *testing.T) {
	ctx := context.Background()
	vaultRepo := repository.NewMemoryTaxVaultRepository()
	invoiceRepo := repository.NewMemoryClientInvoiceRepository()
	rules, err := repository.LoadTaxRulesFromJSONFile("/Users/lorenzo/freelanc-financial/freelance-financial/docs/tax-rules-2026-nl.json")
	if err != nil {
		t.Fatalf("load rules: %v", err)
	}
	if err := vaultRepo.SeedTaxRules(ctx, rules); err != nil {
		t.Fatalf("seed rules: %v", err)
	}
	service := tax.NewTaxVaultService(vaultRepo, repository.NewMemoryExpenseRepository(t.TempDir()), invoiceRepo)

	for i, status := range []string{
		model.InvoiceStatusSent, model.InvoiceStatusPaid,
		model.InvoiceStatusDraft, model.InvoiceStatusCancelled,
	} {
		_ = invoiceRepo.CreateInvoice(ctx, &model.Invoice{
			ID:             "inv-" + status,
			CompanyID:      "comp-status",
			InvoiceNumber:  "INV-2026-000" + string(rune('1'+i)),
			IssueDate:      "2026-03-10",
			Status:         status,
			SubtotalCents:  100000, // €1000 each
			VatAmountCents: 21000,
			TotalCents:     121000,
		})
	}

	overview, err := service.GetOverview(ctx, "comp-status", 2026)
	if err != nil {
		t.Fatalf("get overview: %v", err)
	}
	// Only the SENT and PAID invoices are revenue
	if overview.Totals.RevenueExclVat != 2000 {
		t.Fatalf("expected revenue €2000 from sent+paid invoices, got €%.2f", overview.Totals.RevenueExclVat)
	}
}
