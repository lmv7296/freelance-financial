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
	"go-freelancer/internal/repository"
	"go-freelancer/internal/service"
	"go-freelancer/internal/service/report"
	"go-freelancer/internal/service/tax"
)

func setupAuthTestMux() (*http.ServeMux, service.AuthService) {
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
	// Use relaxed limiter for testing so tests don't exhaust rate limits
	testLimiter := middleware.NewRateLimiter(1000, 1000)
	h.RegisterRoutes(mux, testLimiter)

	return mux, authSvc
}

func TestAuthFlow_RegisterLoginLogout(t *testing.T) {
	mux, authSvc := setupAuthTestMux()

	// 1. Register new user
	regPayload := map[string]string{
		"email":    "alice@example.com",
		"password": "supersecurepassword123",
	}
	body, _ := json.Marshal(regPayload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("expected registration status 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var regResp struct {
		User map[string]any `json:"user"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &regResp); err != nil {
		t.Fatalf("failed to parse registration response: %v", err)
	}
	if regResp.User["email"] != "alice@example.com" {
		t.Errorf("expected email alice@example.com, got %v", regResp.User["email"])
	}

	expectedKeys := []string{
		"id", "email", "full_name", "phone_number", "country",
		"business_name", "vat_number", "tax_regime", "is_verified",
		"company_id", "created_at", "updated_at",
	}
	for _, key := range expectedKeys {
		if _, exists := regResp.User[key]; !exists {
			t.Errorf("expected key %q in register user JSON response, but it was missing", key)
		}
	}

	// Security: Verify password hash is NEVER leaked in JSON
	if bytes.Contains(rr.Body.Bytes(), []byte("password_hash")) || bytes.Contains(rr.Body.Bytes(), []byte("$2a$")) {
		t.Error("CRITICAL SECURITY FLAW: password hash was leaked in JSON response")
	}

	// 2. Reject duplicate email registration
	dupReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	dupReq.Header.Set("Content-Type", "application/json")
	dupRR := httptest.NewRecorder()

	mux.ServeHTTP(dupRR, dupReq)

	if dupRR.Code != http.StatusConflict {
		t.Fatalf("expected duplicate registration status 409, got %d", dupRR.Code)
	}

	// 3. Reject weak password (< 8 chars)
	weakPayload := map[string]string{
		"email":    "bob@example.com",
		"password": "short",
	}
	weakBody, _ := json.Marshal(weakPayload)
	weakReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(weakBody))
	weakReq.Header.Set("Content-Type", "application/json")
	weakRR := httptest.NewRecorder()

	mux.ServeHTTP(weakRR, weakReq)

	if weakRR.Code != http.StatusBadRequest {
		t.Fatalf("expected weak password status 400, got %d", weakRR.Code)
	}

	// 4. Test Login with wrong password
	wrongLoginPayload := map[string]string{
		"email":    "alice@example.com",
		"password": "wrongpassword123",
	}
	wrongBody, _ := json.Marshal(wrongLoginPayload)
	wrongReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(wrongBody))
	wrongReq.Header.Set("Content-Type", "application/json")
	wrongRR := httptest.NewRecorder()

	mux.ServeHTTP(wrongRR, wrongReq)

	if wrongRR.Code != http.StatusUnauthorized {
		t.Fatalf("expected wrong login status 401, got %d", wrongRR.Code)
	}

	// 5. Test Login with valid credentials
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	loginReq.Header.Set("Content-Type", "application/json")
	loginRR := httptest.NewRecorder()

	mux.ServeHTTP(loginRR, loginReq)

	if loginRR.Code != http.StatusOK {
		t.Fatalf("expected successful login status 200, got %d: %s", loginRR.Code, loginRR.Body.String())
	}

	// Verify Bearer token in JSON
	var loginResp struct {
		Token string         `json:"token"`
		User  map[string]any `json:"user"`
	}
	if err := json.Unmarshal(loginRR.Body.Bytes(), &loginResp); err != nil {
		t.Fatalf("failed to decode login response: %v", err)
	}
	if loginResp.Token == "" {
		t.Fatal("expected non-empty token in login response")
	}

	for _, key := range expectedKeys {
		if _, exists := loginResp.User[key]; !exists {
			t.Errorf("expected key %q in login user JSON response, but it was missing", key)
		}
	}

	// Verify HttpOnly cookie
	cookies := loginRR.Result().Cookies()
	var sessionCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "session_token" {
			sessionCookie = c
			break
		}
	}
	if sessionCookie == nil {
		t.Fatal("expected session_token cookie to be set")
	}
	if !sessionCookie.HttpOnly {
		t.Error("expected session_token cookie to have HttpOnly flag set")
	}
	if sessionCookie.SameSite != http.SameSiteStrictMode {
		t.Errorf("expected SameSite=Strict, got %v", sessionCookie.SameSite)
	}

	// 6. Test Logout using Bearer token
	logoutReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	logoutReq.Header.Set("Authorization", "Bearer "+loginResp.Token)
	logoutRR := httptest.NewRecorder()

	mux.ServeHTTP(logoutRR, logoutReq)

	if logoutRR.Code != http.StatusOK {
		t.Fatalf("expected logout status 200, got %d", logoutRR.Code)
	}

	// Verify cookie was cleared in response
	logoutCookies := logoutRR.Result().Cookies()
	var clearedCookie *http.Cookie
	for _, c := range logoutCookies {
		if c.Name == "session_token" {
			clearedCookie = c
			break
		}
	}
	if clearedCookie == nil || clearedCookie.MaxAge >= 0 {
		t.Error("expected session_token cookie to be expired/deleted on logout")
	}

	// Verify session token is now invalid in service
	_, err := authSvc.ValidateSession(logoutReq.Context(), loginResp.Token)
	if err == nil {
		t.Error("expected invalidated token to fail session validation")
	}
}
