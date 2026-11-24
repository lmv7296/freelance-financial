package handler_test

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"go-freelancer/internal/handler"
	"go-freelancer/internal/middleware"
	"go-freelancer/internal/repository"
	"go-freelancer/internal/service"
	"go-freelancer/internal/service/report"
	"go-freelancer/internal/service/tax"
)

func TestHealthCheck(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	userRepo := repository.NewMemoryUserRepository()
	sessionRepo := repository.NewMemorySessionRepository()
	generalRepo := repository.NewMemoryRepository()
	companyRepo := repository.NewMemoryCompanyRepository()
	settingsRepo := repository.NewMemorySettingsRepository()
	expenseRepo := repository.NewMemoryExpenseRepository("./uploads/receipts")
	clientRepo := repository.NewMemoryClientInvoiceRepository()
	taxVaultRepo := repository.NewMemoryTaxVaultRepository()

	authSvc := service.NewAuthService(userRepo, sessionRepo, companyRepo, settingsRepo, taxVaultRepo, service.NewLoggingEmailSender(logger))
	svc := service.New(generalRepo)
	settingsSvc := service.NewSettingsService(settingsRepo, clientRepo)
	expenseSvc := service.NewExpenseService(expenseRepo, clientRepo)
	clientInvSvc := service.NewClientInvoiceService(clientRepo, settingsRepo)
	taxVaultSvc := tax.NewTaxVaultService(taxVaultRepo, expenseRepo, clientRepo)
	reportSvc := report.NewReportService(companyRepo, clientRepo, expenseRepo, taxVaultRepo)
	extractor := service.NewDefaultReceiptExtractor()
	whatsAppSvc := service.NewWhatsAppService(settingsRepo, expenseSvc, extractor, logger)
	h := handler.New(svc, authSvc, settingsSvc, expenseSvc, taxVaultSvc, reportSvc, whatsAppSvc, clientInvSvc, logger, false)

	mux := http.NewServeMux()
	h.RegisterRoutes(mux, middleware.NewAuthRateLimiter())

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rr := httptest.NewRecorder()

	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	contentType := rr.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", contentType)
	}

	var body map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if body["status"] != "available" {
		t.Errorf("expected status 'available', got %v", body["status"])
	}
}
