package service_test

import (
	"context"
	"encoding/base64"
	"errors"
	"os"
	"strings"
	"testing"
	"time"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
	"go-freelancer/internal/service"
)

func setupExpenseTestService(t *testing.T) (service.ExpenseService, repository.ClientInvoiceRepository, string) {
	tempDir, err := os.MkdirTemp("", "receipt_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(tempDir) })

	expenseRepo := repository.NewMemoryExpenseRepository(tempDir)
	clientRepo := repository.NewMemoryClientInvoiceRepository()
	svc := service.NewExpenseService(expenseRepo, clientRepo)

	return svc, clientRepo, "company_test_1"
}

func TestExpenseService_Create_Success(t *testing.T) {
	svc, clientRepo, companyID := setupExpenseTestService(t)
	ctx := context.Background()

	// Seed client and invoice
	client := &model.Client{
		ID:        "client_1",
		CompanyID: companyID,
		Name:      "Acme Corp B.V.",
		CreatedAt: time.Now(),
	}
	_ = clientRepo.CreateClient(ctx, client)

	invoice := &model.Invoice{
		ID:            "inv_1",
		CompanyID:     companyID,
		ClientID:      "client_1",
		InvoiceNumber: "INV-2026-0042",
		CreatedAt:     time.Now(),
	}
	_ = clientRepo.CreateInvoice(ctx, invoice)

	subtotal := 100.00
	vat := 21.00
	total := 121.00
	date := "2026-05-15"
	paymentMethod := "PIN / Betaalpas"
	category := "Bouwmaterialen & Onderdelen"
	clientID := "client_1"
	invoiceID := "inv_1"
	spoofedClientName := "Untrusted Name"
	spoofedInvoiceNum := "UNTRUSTED-999"

	// Minimal 1x1 transparent PNG in base64
	pngBase64 := "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

	req := &model.CreateExpenseRequest{
		MerchantName:    "  Bouwmaat Amsterdam  ",
		ReceiptDate:     &date,
		PaymentMethod:   &paymentMethod,
		Category:        &category,
		SubtotalAmount:  &subtotal,
		VatAmount:       &vat,
		TotalAmount:     total,
		ReceiptURL:      pngBase64,
		ClientID:        &clientID,
		ClientName:      &spoofedClientName,
		InvoiceID:       &invoiceID,
		InvoiceNumber:   &spoofedInvoiceNum,
	}

	expense, err := svc.CreateExpense(ctx, companyID, req)
	if err != nil {
		t.Fatalf("unexpected error creating expense: %v", err)
	}

	if expense.MerchantName != "Bouwmaat Amsterdam" {
		t.Errorf("expected trimmed merchant name, got %q", expense.MerchantName)
	}
	if expense.TotalAmount != 121.00 {
		t.Errorf("expected total amount 121.00, got %f", expense.TotalAmount)
	}
	if expense.Status != model.ExpenseStatusApproved {
		t.Errorf("expected default status approved, got %s", expense.Status)
	}
	// Verify server derived client_name and invoice_number rather than trusting sent values
	if expense.ClientName == nil || *expense.ClientName != "Acme Corp B.V." {
		t.Errorf("expected derived client name 'Acme Corp B.V.', got %v", expense.ClientName)
	}
	if expense.InvoiceNumber == nil || *expense.InvoiceNumber != "INV-2026-0042" {
		t.Errorf("expected derived invoice number 'INV-2026-0042', got %v", expense.InvoiceNumber)
	}
	// Verify receipt URL replaced with local URL
	if !strings.HasPrefix(expense.ReceiptURL, "/api/v1/receipts/") {
		t.Errorf("expected receipt URL to start with /api/v1/receipts/, got %q", expense.ReceiptURL)
	}
	if expense.ReceiptContentType == nil || *expense.ReceiptContentType != "image/png" {
		t.Errorf("expected content type image/png, got %v", expense.ReceiptContentType)
	}
}

func TestExpenseService_Create_ValidationErrors(t *testing.T) {
	svc, _, companyID := setupExpenseTestService(t)
	ctx := context.Background()

	// 1. Empty merchant name
	req1 := &model.CreateExpenseRequest{
		MerchantName: "   ",
		TotalAmount:  50.00,
	}
	_, err := svc.CreateExpense(ctx, companyID, req1)
	if !errors.Is(err, service.ErrInvalidMerchantName) {
		t.Errorf("expected ErrInvalidMerchantName, got %v", err)
	}

	// 2. Invalid status
	badStatus := model.ExpenseStatus("invalid_status")
	req2 := &model.CreateExpenseRequest{
		MerchantName: "Gamma",
		TotalAmount:  50.00,
		Status:       &badStatus,
	}
	_, err2 := svc.CreateExpense(ctx, companyID, req2)
	if !errors.Is(err2, service.ErrInvalidStatus) {
		t.Errorf("expected ErrInvalidStatus, got %v", err2)
	}

	// 3. Unsupported receipt format
	zipData := "data:application/zip;base64," + base64.StdEncoding.EncodeToString([]byte("fake-zip"))
	req3 := &model.CreateExpenseRequest{
		MerchantName: "Gamma",
		TotalAmount:  50.00,
		ReceiptURL:   zipData,
	}
	_, err3 := svc.CreateExpense(ctx, companyID, req3)
	if !errors.Is(err3, service.ErrUnsupportedReceiptType) {
		t.Errorf("expected ErrUnsupportedReceiptType, got %v", err3)
	}
}

func TestExpenseService_List_NewestFirstAndFiltering(t *testing.T) {
	svc, _, companyID := setupExpenseTestService(t)
	ctx := context.Background()

	date1 := "2026-01-10"
	date2 := "2026-03-20"
	date3 := "2026-02-15"

	needsReview := model.ExpenseStatusNeedsReview
	approved := model.ExpenseStatusApproved

	_, _ = svc.CreateExpense(ctx, companyID, &model.CreateExpenseRequest{
		MerchantName: "Gamma",
		ReceiptDate:  &date1,
		TotalAmount:  10.00,
		Status:       &approved,
	})
	_, _ = svc.CreateExpense(ctx, companyID, &model.CreateExpenseRequest{
		MerchantName: "Praxis",
		ReceiptDate:  &date2,
		TotalAmount:  20.00,
		Status:       &needsReview,
	})
	_, _ = svc.CreateExpense(ctx, companyID, &model.CreateExpenseRequest{
		MerchantName: "Bouwmaat",
		ReceiptDate:  &date3,
		TotalAmount:  30.00,
		Status:       &approved,
	})

	// 1. List all - should be newest date first (date2 Praxis, date3 Bouwmaat, date1 Gamma)
	list, err := svc.ListExpenses(ctx, companyID, nil, nil)
	if err != nil {
		t.Fatalf("unexpected list error: %v", err)
	}
	if len(list) != 3 {
		t.Fatalf("expected 3 expenses, got %d", len(list))
	}
	if list[0].MerchantName != "Praxis" || list[1].MerchantName != "Bouwmaat" || list[2].MerchantName != "Gamma" {
		t.Errorf("expenses not ordered newest first: %s, %s, %s", list[0].MerchantName, list[1].MerchantName, list[2].MerchantName)
	}

	// 2. Filter by status = needs_review
	statusFilter := "needs_review"
	filtered, err := svc.ListExpenses(ctx, companyID, &statusFilter, nil)
	if err != nil {
		t.Fatalf("filter error: %v", err)
	}
	if len(filtered) != 1 || filtered[0].MerchantName != "Praxis" {
		t.Errorf("expected only Praxis for needs_review, got %d items", len(filtered))
	}

	// 3. Search filter
	searchFilter := "bouw"
	searched, err := svc.ListExpenses(ctx, companyID, nil, &searchFilter)
	if err != nil {
		t.Fatalf("search error: %v", err)
	}
	if len(searched) != 1 || searched[0].MerchantName != "Bouwmaat" {
		t.Errorf("expected 1 search result Bouwmaat, got %d", len(searched))
	}
}

func TestExpenseService_CompanyIsolation(t *testing.T) {
	svc, _, companyA := setupExpenseTestService(t)
	companyB := "company_test_2"
	ctx := context.Background()

	e, err := svc.CreateExpense(ctx, companyA, &model.CreateExpenseRequest{
		MerchantName: "Toolstation",
		TotalAmount:  45.00,
	})
	if err != nil {
		t.Fatalf("create error: %v", err)
	}

	// Company B should not be able to get company A's expense
	_, err = svc.GetExpense(ctx, companyB, e.ID)
	if err == nil {
		t.Error("expected error accessing another company's expense, got nil")
	}

	// Company B's list should be empty
	listB, err := svc.ListExpenses(ctx, companyB, nil, nil)
	if err != nil {
		t.Fatalf("list error: %v", err)
	}
	if len(listB) != 0 {
		t.Errorf("expected 0 expenses for company B, got %d", len(listB))
	}
}
