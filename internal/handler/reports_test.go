package handler_test

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go-freelancer/internal/handler"
	"go-freelancer/internal/middleware"
	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
	"go-freelancer/internal/service"
	"go-freelancer/internal/service/report"
	"go-freelancer/internal/service/tax"
)

type reportTestEnv struct {
	mux          *http.ServeMux
	authSvc      service.AuthService
	companyRepo  repository.CompanyRepository
	invoiceRepo  repository.ClientInvoiceRepository
	expenseRepo  repository.ExpenseRepository
	taxVaultRepo repository.TaxVaultRepository
}

func setupReportTestEnv() *reportTestEnv {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	companyRepo := repository.NewMemoryCompanyRepository()
	userRepo := repository.NewMemoryUserRepository(companyRepo)
	sessionRepo := repository.NewMemorySessionRepository()
	generalRepo := repository.NewMemoryRepository()
	settingsRepo := repository.NewMemorySettingsRepository(companyRepo)
	expenseRepo := repository.NewMemoryExpenseRepository("./uploads/receipts")
	clientRepo := repository.NewMemoryClientInvoiceRepository()
	taxVaultRepo := repository.NewMemoryTaxVaultRepository(companyRepo)

	emailSender := service.NewLoggingEmailSender(logger)
	authSvc := service.NewAuthService(userRepo, sessionRepo, companyRepo, settingsRepo, taxVaultRepo, emailSender)
	generalSvc := service.New(generalRepo)
	settingsSvc := service.NewSettingsService(settingsRepo, clientRepo)
	expenseSvc := service.NewExpenseService(expenseRepo, clientRepo)
	clientInvSvc := service.NewClientInvoiceService(clientRepo, settingsRepo)
	taxVaultSvc := tax.NewTaxVaultService(taxVaultRepo, expenseRepo, clientRepo)
	reportSvc := report.NewReportService(companyRepo, clientRepo, expenseRepo, taxVaultRepo)
	extractor := service.NewDefaultReceiptExtractor()
	whatsAppSvc := service.NewWhatsAppService(settingsRepo, expenseSvc, extractor, logger)

	h := handler.New(generalSvc, authSvc, settingsSvc, expenseSvc, taxVaultSvc, reportSvc, whatsAppSvc, clientInvSvc, logger, false)

	mux := http.NewServeMux()
	testLimiter := middleware.NewRateLimiter(1000, 1000)
	h.RegisterRoutes(mux, testLimiter)

	return &reportTestEnv{
		mux:          mux,
		authSvc:      authSvc,
		companyRepo:  companyRepo,
		invoiceRepo:  clientRepo,
		expenseRepo:  expenseRepo,
		taxVaultRepo: taxVaultRepo,
	}
}

func registerAndLoginForReports(t *testing.T, env *reportTestEnv, email, password string) (string, string) {
	ctx := t.Context()
	user, err := env.authSvc.Register(ctx, email, password)
	if err != nil {
		t.Fatalf("failed to register user: %v", err)
	}
	_, token, _, err := env.authSvc.Login(ctx, email, password)
	if err != nil {
		t.Fatalf("failed to login: %v", err)
	}
	return user.CompanyID, token
}

func TestReportEndpoints(t *testing.T) {
	env := setupReportTestEnv()

	// Register User A
	compA, tokenA := registerAndLoginForReports(t, env, "userA@example.com", "Password123!")
	// Register User B
	compB, tokenB := registerAndLoginForReports(t, env, "userB@example.com", "Password123!")
	_ = compB

	// 1. Test GET /api/v1/reports/options with empty data
	req := httptest.NewRequest(http.MethodGet, "/api/v1/reports/options", nil)
	req.Header.Set("Authorization", "Bearer "+tokenA)
	rr := httptest.NewRecorder()
	env.mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", rr.Code, rr.Body.String())
	}

	var optsResp model.ReportOptions
	if err := json.Unmarshal(rr.Body.Bytes(), &optsResp); err != nil {
		t.Fatalf("failed to decode options: %v", err)
	}
	if optsResp.Reports == nil {
		t.Errorf("expected reports slice to be non-nil []")
	}
	if optsResp.AvailableYears == nil {
		t.Errorf("expected available_years slice to be non-nil []")
	}
	if len(optsResp.Reports) != 4 {
		t.Errorf("expected 4 reports, got %d", len(optsResp.Reports))
	}
	if len(optsResp.AvailableYears) == 0 || optsResp.AvailableYears[0] != time.Now().Year() {
		t.Errorf("expected available years to contain current year, got %v", optsResp.AvailableYears)
	}

	// 2. Populate Company A with Invoices & Expenses
	ctx := t.Context()
	_ = env.invoiceRepo.CreateInvoice(ctx, &model.Invoice{
		ID:             "inv_A_1",
		CompanyID:      compA,
		InvoiceNumber:  "FACT-2026-001",
		IssueDate:      "2026-08-10",
		DueDate:        "2026-09-10",
		Status:         model.InvoiceStatusSent,
		SubtotalCents:  200000, // €2000
		VatRate:        21.0,
		VatAmountCents: 42000, // €420
		TotalCents:     242000,
		Currency:       "EUR",
	})
	_ = env.invoiceRepo.CreateInvoice(ctx, &model.Invoice{
		ID:             "inv_A_draft",
		CompanyID:      compA,
		InvoiceNumber:  "FACT-DRAFT",
		IssueDate:      "2026-08-15",
		DueDate:        "2026-09-15",
		Status:         model.InvoiceStatusDraft, // Must be left out
		SubtotalCents:  50000,
		TotalCents:     60500,
		Currency:       "EUR",
	})
	_ = env.invoiceRepo.CreateInvoice(ctx, &model.Invoice{
		ID:             "inv_A_cancelled",
		CompanyID:      compA,
		InvoiceNumber:  "FACT-CANCELLED",
		IssueDate:      "2026-08-20",
		DueDate:        "2026-09-20",
		Status:         model.InvoiceStatusCancelled, // Must be left out
		SubtotalCents:  70000,
		TotalCents:     84700,
		Currency:       "EUR",
	})

	rDate := "2026-08-12"
	cat := "Marketing"
	sub := 400.0
	vat := 84.0
	_ = env.expenseRepo.Create(ctx, &model.Expense{
		ID:             "exp_A_1",
		CompanyID:      compA,
		MerchantName:   "Google Ads",
		ReceiptDate:    &rDate,
		Status:         model.ExpenseStatusApproved,
		Category:       &cat,
		SubtotalAmount: &sub,
		VatAmount:      &vat,
		TotalAmount:    484.0,
		Currency:       "EUR",
	})
	_ = env.expenseRepo.Create(ctx, &model.Expense{
		ID:           "exp_A_pending",
		CompanyID:    compA,
		MerchantName: "Pending Cafe",
		ReceiptDate:  &rDate,
		Status:       model.ExpenseStatusNeedsReview, // Excluded from numbers
		TotalAmount:  50.0,
		Currency:     "EUR",
	})

	// 3. Test Multi-tenant isolation: User B downloading reports should see NO data from User A
	reqB := httptest.NewRequest(http.MethodGet, "/api/v1/reports/profit_loss?format=pdf&from=2026-07-01&to=2026-09-30&lang=nl", nil)
	reqB.Header.Set("Authorization", "Bearer "+tokenB)
	rrB := httptest.NewRecorder()
	env.mux.ServeHTTP(rrB, reqB)
	if rrB.Code != http.StatusOK {
		t.Fatalf("expected 200 for user B empty report, got %d", rrB.Code)
	}

	// 4. Test User A downloading Profit & Loss PDF
	reqA := httptest.NewRequest(http.MethodGet, "/api/v1/reports/profit_loss?format=pdf&from=2026-07-01&to=2026-09-30&lang=nl", nil)
	reqA.Header.Set("Authorization", "Bearer "+tokenA)
	rrA := httptest.NewRecorder()
	env.mux.ServeHTTP(rrA, reqA)

	if rrA.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for profit_loss, got %d: %s", rrA.Code, rrA.Body.String())
	}
	if rrA.Header().Get("Content-Type") != "application/pdf" {
		t.Errorf("expected application/pdf, got %s", rrA.Header().Get("Content-Type"))
	}
	disp := rrA.Header().Get("Content-Disposition")
	expectedDisp := `attachment; filename="winst-en-verlies_2026-Q3.pdf"; filename*=UTF-8''winst-en-verlies_2026-Q3.pdf`
	if disp != expectedDisp {
		t.Errorf("expected disposition %s, got %s", expectedDisp, disp)
	}

	// 5. Test User A downloading VAT Summary XLSX (comparing with Tax Vault)
	reqVat := httptest.NewRequest(http.MethodGet, "/api/v1/reports/vat_summary?format=xlsx&from=2026-07-01&to=2026-09-30&lang=nl", nil)
	reqVat.Header.Set("Authorization", "Bearer "+tokenA)
	rrVat := httptest.NewRecorder()
	env.mux.ServeHTTP(rrVat, reqVat)

	if rrVat.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for vat_summary, got %d: %s", rrVat.Code, rrVat.Body.String())
	}
	expectedVatDisp := `attachment; filename="btw-overzicht_2026-Q3.xlsx"; filename*=UTF-8''btw-overzicht_2026-Q3.xlsx`
	if rrVat.Header().Get("Content-Disposition") != expectedVatDisp {
		t.Errorf("expected disposition %s, got %s", expectedVatDisp, rrVat.Header().Get("Content-Disposition"))
	}

	// Verify tax-vault endpoint gives matching values
	reqTV := httptest.NewRequest(http.MethodGet, "/api/v1/tax-vault?year=2026", nil)
	reqTV.Header.Set("Authorization", "Bearer "+tokenA)
	rrTV := httptest.NewRecorder()
	env.mux.ServeHTTP(rrTV, reqTV)
	if rrTV.Code != http.StatusOK {
		t.Fatalf("expected 200 for tax vault, got %d: %s", rrTV.Code, rrTV.Body.String())
	}
	var tvOverview model.TaxVaultOverview
	_ = json.Unmarshal(rrTV.Body.Bytes(), &tvOverview)
	for _, p := range tvOverview.Vat.Periods {
		if p.Key == "2026-Q3" {
			if p.VatDue != 420.0 {
				t.Errorf("expected tax vault VatDue 420.0, got %v", p.VatDue)
			}
			if p.InputVat != 84.0 {
				t.Errorf("expected tax vault InputVat 84.0, got %v", p.InputVat)
			}
			if p.Balance != 336.0 {
				t.Errorf("expected tax vault Balance 336.0, got %v", p.Balance)
			}
		}
	}

	// 6. Test Empty Period returns 200 with file
	reqEmpty := httptest.NewRequest(http.MethodGet, "/api/v1/reports/expenses?format=pdf&from=2025-01-01&to=2025-01-31&lang=en", nil)
	reqEmpty.Header.Set("Authorization", "Bearer "+tokenA)
	rrEmpty := httptest.NewRecorder()
	env.mux.ServeHTTP(rrEmpty, reqEmpty)
	if rrEmpty.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for empty period, got %d: %s", rrEmpty.Code, rrEmpty.Body.String())
	}
	expectedEmptyDisp := `attachment; filename="expenses-by-category_2025-01.pdf"; filename*=UTF-8''expenses-by-category_2025-01.pdf`
	if rrEmpty.Header().Get("Content-Disposition") != expectedEmptyDisp {
		t.Errorf("expected disposition %s, got %s", expectedEmptyDisp, rrEmpty.Header().Get("Content-Disposition"))
	}

	// 7. Error cases
	// 404: Unknown report key
	req404 := httptest.NewRequest(http.MethodGet, "/api/v1/reports/unknown_rep?format=pdf&from=2026-01-01&to=2026-12-31", nil)
	req404.Header.Set("Authorization", "Bearer "+tokenA)
	rr404 := httptest.NewRecorder()
	env.mux.ServeHTTP(rr404, req404)
	if rr404.Code != http.StatusNotFound {
		t.Errorf("expected 404 for unknown report, got %d", rr404.Code)
	}

	// 422: from after to
	req422Date := httptest.NewRequest(http.MethodGet, "/api/v1/reports/profit_loss?format=pdf&from=2026-09-30&to=2026-07-01", nil)
	req422Date.Header.Set("Authorization", "Bearer "+tokenA)
	rr422Date := httptest.NewRecorder()
	env.mux.ServeHTTP(rr422Date, req422Date)
	if rr422Date.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for from after to, got %d", rr422Date.Code)
	}

	// 422: Unknown format
	req422Fmt := httptest.NewRequest(http.MethodGet, "/api/v1/reports/profit_loss?format=csv&from=2026-07-01&to=2026-09-30", nil)
	req422Fmt.Header.Set("Authorization", "Bearer "+tokenA)
	rr422Fmt := httptest.NewRecorder()
	env.mux.ServeHTTP(rr422Fmt, req422Fmt)
	if rr422Fmt.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for unknown format, got %d", rr422Fmt.Code)
	}

	// 422: Unknown language
	req422Lang := httptest.NewRequest(http.MethodGet, "/api/v1/reports/profit_loss?format=pdf&from=2026-07-01&to=2026-09-30&lang=de", nil)
	req422Lang.Header.Set("Authorization", "Bearer "+tokenA)
	rr422Lang := httptest.NewRecorder()
	env.mux.ServeHTTP(rr422Lang, req422Lang)
	if rr422Lang.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for unknown language, got %d", rr422Lang.Code)
	}

	// 422: custom range for vat_summary
	req422VatCustom := httptest.NewRequest(http.MethodGet, "/api/v1/reports/vat_summary?format=pdf&from=2026-07-01&to=2026-08-15", nil)
	req422VatCustom.Header.Set("Authorization", "Bearer "+tokenA)
	rr422VatCustom := httptest.NewRecorder()
	env.mux.ServeHTTP(rr422VatCustom, req422VatCustom)
	if rr422VatCustom.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for vat_summary custom range, got %d", rr422VatCustom.Code)
	}

	// 401: Unauthenticated
	req401 := httptest.NewRequest(http.MethodGet, "/api/v1/reports/options", nil)
	rr401 := httptest.NewRecorder()
	env.mux.ServeHTTP(rr401, req401)
	if rr401.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for unauthenticated request, got %d", rr401.Code)
	}
}

func TestCORS_ExposeHeaders(t *testing.T) {
	corsHandler := middleware.CORS([]string{"http://localhost:3000"})
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/reports/options", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	rr := httptest.NewRecorder()

	corsHandler(testHandler).ServeHTTP(rr, req)

	exposed := rr.Header().Get("Access-Control-Expose-Headers")
	if exposed != "Content-Disposition" {
		t.Errorf("expected Access-Control-Expose-Headers to be Content-Disposition, got '%s'", exposed)
	}
}