package handler_test

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"go-freelancer/internal/handler"
	"go-freelancer/internal/middleware"
	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
	"go-freelancer/internal/service"
	"go-freelancer/internal/service/report"
	"go-freelancer/internal/service/tax"
)

func setupTestApp() (*http.ServeMux, service.AuthService, string, string) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	companyRepo := repository.NewMemoryCompanyRepository()
	userRepo := repository.NewMemoryUserRepository(companyRepo)
	sessionRepo := repository.NewMemorySessionRepository()
	generalRepo := repository.NewMemoryRepository()
	settingsRepo := repository.NewMemorySettingsRepository(companyRepo)
	expenseRepo := repository.NewMemoryExpenseRepository("./uploads/receipts")
	clientRepo := repository.NewMemoryClientInvoiceRepository()
	taxVaultRepo := repository.NewMemoryTaxVaultRepository(companyRepo)

	authSvc := service.NewAuthService(userRepo, sessionRepo, companyRepo, settingsRepo, taxVaultRepo, service.NewLoggingEmailSender(logger))
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

	// Register a test user
	regPayload := map[string]string{
		"email":    "jan@devries.nl",
		"password": "Password123!",
	}
	body, _ := json.Marshal(regPayload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	// Login to get token
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	loginReq.Header.Set("Content-Type", "application/json")
	loginRR := httptest.NewRecorder()
	mux.ServeHTTP(loginRR, loginReq)

	var loginResp struct {
		Token string `json:"token"`
		User  struct {
			ID        string `json:"id"`
			CompanyID string `json:"company_id"`
		} `json:"user"`
	}
	_ = json.Unmarshal(loginRR.Body.Bytes(), &loginResp)

	return mux, authSvc, loginResp.Token, loginResp.User.CompanyID
}

func TestGetConfig_Unauthorized(t *testing.T) {
	mux, _, _, _ := setupTestApp()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/config", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", rr.Code)
	}
}

func TestGetConfig_Success(t *testing.T) {
	mux, _, token, _ := setupTestApp()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/config", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var cfg model.AppConfig
	if err := json.Unmarshal(rr.Body.Bytes(), &cfg); err != nil {
		t.Fatalf("failed to decode config response: %v", err)
	}

	if len(cfg.PaymentMethods) == 0 {
		t.Error("expected non-empty payment_methods")
	}
	if len(cfg.VATRates) == 0 {
		t.Error("expected non-empty vat_rates")
	}
	if len(cfg.Categories) == 0 {
		t.Error("expected non-empty categories")
	}
	if len(cfg.CommonMerchants) == 0 {
		t.Error("expected non-empty common_merchants")
	}
}

func TestSettingsLists_GetAndPut(t *testing.T) {
	mux, _, token, _ := setupTestApp()

	// 1. GET initial lists
	req := httptest.NewRequest(http.MethodGet, "/api/v1/settings/lists", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var getResp struct {
		Lists model.CompanyLists `json:"lists"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &getResp); err != nil {
		t.Fatalf("failed to parse get lists response: %v", err)
	}
	if len(getResp.Lists.Merchants) == 0 {
		t.Error("expected default merchants")
	}

	// 2. PUT updated lists
	cat := "Bouwmaterialen & Onderdelen"
	updatePayload := map[string]any{
		"lists": model.CompanyLists{
			Merchants: []model.QuickSelectMerchant{
				{Name: "Gamma", Category: &cat},
			},
			Categories: []string{
				"Bouwmaterialen & Onderdelen",
			},
			PaymentMethods: []string{
				"PIN / Betaalpas",
				"Contant",
			},
		},
	}
	body, _ := json.Marshal(updatePayload)
	putReq := httptest.NewRequest(http.MethodPut, "/api/v1/settings/lists", bytes.NewReader(body))
	putReq.Header.Set("Authorization", "Bearer "+token)
	putReq.Header.Set("Content-Type", "application/json")
	putRR := httptest.NewRecorder()
	mux.ServeHTTP(putRR, putReq)

	if putRR.Code != http.StatusOK {
		t.Fatalf("expected PUT status 200, got %d: %s", putRR.Code, putRR.Body.String())
	}

	var putResp struct {
		Lists model.CompanyLists `json:"lists"`
	}
	if err := json.Unmarshal(putRR.Body.Bytes(), &putResp); err != nil {
		t.Fatalf("failed to parse put response: %v", err)
	}
	if len(putResp.Lists.Merchants) != 1 || putResp.Lists.Merchants[0].Name != "Gamma" {
		t.Errorf("expected 1 merchant Gamma, got %v", putResp.Lists.Merchants)
	}

	// 3. GET /api/v1/config to verify reflection
	cfgReq := httptest.NewRequest(http.MethodGet, "/api/v1/config", nil)
	cfgReq.Header.Set("Authorization", "Bearer "+token)
	cfgRR := httptest.NewRecorder()
	mux.ServeHTTP(cfgRR, cfgReq)

	var cfg model.AppConfig
	_ = json.Unmarshal(cfgRR.Body.Bytes(), &cfg)
	if len(cfg.CommonMerchants) != 1 || cfg.CommonMerchants[0].Name != "Gamma" {
		t.Errorf("config does not reflect updated merchant: %v", cfg.CommonMerchants)
	}
	if len(cfg.Categories) != 1 || cfg.Categories[0] != "Bouwmaterialen & Onderdelen" {
		t.Errorf("config does not reflect updated categories: %v", cfg.Categories)
	}
	if len(cfg.PaymentMethods) != 2 {
		t.Errorf("config does not reflect updated payment methods: %v", cfg.PaymentMethods)
	}
}

func TestSettingsLists_ValidationRejection(t *testing.T) {
	mux, _, token, _ := setupTestApp()

	// 1. Empty name
	emptyPayload := map[string]any{
		"lists": map[string]any{
			"merchants": []map[string]any{
				{"name": "   "},
			},
			"categories":     []string{"Category A"},
			"payment_methods": []string{"PIN"},
		},
	}
	b, _ := json.Marshal(emptyPayload)
	req := httptest.NewRequest(http.MethodPut, "/api/v1/settings/lists", bytes.NewReader(b))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnprocessableEntity && rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 422 or 400 for empty list item, got %d", rr.Code)
	}

	// 2. Duplicate case-insensitive name
	dupPayload := map[string]any{
		"lists": map[string]any{
			"merchants": []map[string]any{
				{"name": "Praxis"},
				{"name": "praxis"},
			},
			"categories":     []string{"Category A"},
			"payment_methods": []string{"PIN"},
		},
	}
	b2, _ := json.Marshal(dupPayload)
	req2 := httptest.NewRequest(http.MethodPut, "/api/v1/settings/lists", bytes.NewReader(b2))
	req2.Header.Set("Authorization", "Bearer "+token)
	req2.Header.Set("Content-Type", "application/json")
	rr2 := httptest.NewRecorder()
	mux.ServeHTTP(rr2, req2)

	if rr2.Code != http.StatusUnprocessableEntity && rr2.Code != http.StatusBadRequest {
		t.Fatalf("expected 422 or 400 for duplicate list item, got %d", rr2.Code)
	}
}

func TestGetCurrentUser(t *testing.T) {
	mux, _, token, _ := setupTestApp()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp struct {
		User map[string]any `json:"user"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode user: %v", err)
	}

	if resp.User["email"] != "jan@devries.nl" {
		t.Errorf("expected jan@devries.nl, got %v", resp.User["email"])
	}
	if resp.User["company_id"] == "" || resp.User["company_id"] == nil {
		t.Error("expected non-empty company_id for user")
	}

	// Verify all onboarding fields are explicitly present in JSON
	expectedKeys := []string{
		"id", "email", "full_name", "phone_number", "country",
		"business_name", "vat_number", "tax_regime", "is_verified",
		"company_id", "created_at", "updated_at",
	}
	for _, key := range expectedKeys {
		if _, exists := resp.User[key]; !exists {
			t.Errorf("expected key %q in user JSON response, but it was missing", key)
		}
	}
}

