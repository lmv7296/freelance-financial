package handler_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
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

type onboardingTestContext struct {
	mux          *http.ServeMux
	authSvc      service.AuthService
	userRepo     repository.UserRepository
	settingsRepo repository.SettingsRepository
	taxVaultRepo repository.TaxVaultRepository
}

func setupOnboardingTestApp() *onboardingTestContext {
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

	return &onboardingTestContext{
		mux:          mux,
		authSvc:      authSvc,
		userRepo:     userRepo,
		settingsRepo: settingsRepo,
		taxVaultRepo: taxVaultRepo,
	}
}

func registerAndLogin(t *testing.T, tc *onboardingTestContext, email, password string) (*model.User, string) {
	t.Helper()
	regPayload := map[string]string{"email": email, "password": password}
	regBody, _ := json.Marshal(regPayload)
	regReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(regBody))
	regReq.Header.Set("Content-Type", "application/json")
	regRR := httptest.NewRecorder()
	tc.mux.ServeHTTP(regRR, regReq)

	if regRR.Code != http.StatusCreated {
		t.Fatalf("failed to register: status %d, body: %s", regRR.Code, regRR.Body.String())
	}

	loginPayload := map[string]string{"email": email, "password": password}
	loginBody, _ := json.Marshal(loginPayload)
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBody))
	loginReq.Header.Set("Content-Type", "application/json")
	loginRR := httptest.NewRecorder()
	tc.mux.ServeHTTP(loginRR, loginReq)

	if loginRR.Code != http.StatusOK {
		t.Fatalf("failed to login: status %d, body: %s", loginRR.Code, loginRR.Body.String())
	}

	var loginResp struct {
		Token string     `json:"token"`
		User  model.User `json:"user"`
	}
	if err := json.Unmarshal(loginRR.Body.Bytes(), &loginResp); err != nil {
		t.Fatalf("failed to parse login response: %v", err)
	}

	return &loginResp.User, loginResp.Token
}

func TestOnboarding_UpdateProfile_Success(t *testing.T) {
	tc := setupOnboardingTestApp()
	user, token := registerAndLogin(t, tc, "jan@devriesbouw.nl", "SafePassword123!")

	// 1. Update profile with complete valid onboarding fields
	payload := map[string]string{
		"full_name":     " Jan de Vries ",
		"phone_number":  "06 1234 5678",
		"country":       "nl",
		"business_name": "De Vries Bouw & Montage",
		"tax_regime":    "eenmanszaak",
		"vat_number":    "NL123456789B01",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/me/profile", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	tc.mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp struct {
		User model.User `json:"user"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	u := resp.User
	if u.FullName == nil || *u.FullName != "Jan de Vries" {
		t.Errorf("expected trimmed full_name 'Jan de Vries', got %v", u.FullName)
	}
	if u.PhoneNumber == nil || *u.PhoneNumber != "+31612345678" {
		t.Errorf("expected E.164 normalized phone '+31612345678', got %v", u.PhoneNumber)
	}
	if u.Country == nil || *u.Country != "NL" {
		t.Errorf("expected uppercase country 'NL', got %v", u.Country)
	}
	if u.BusinessName == nil || *u.BusinessName != "De Vries Bouw & Montage" {
		t.Errorf("expected business_name 'De Vries Bouw & Montage', got %v", u.BusinessName)
	}
	if u.LegalForm == nil || *u.LegalForm != model.LegalFormEenmanszaak {
		t.Errorf("expected legal_form 'eenmanszaak', got %v", u.LegalForm)
	}
	if u.TaxRegime == nil || *u.TaxRegime != "NL_BTW_STANDARD" {
		t.Errorf("expected tax_regime 'NL_BTW_STANDARD', got %v", u.TaxRegime)
	}
	if u.VATNumber == nil || *u.VATNumber != "NL123456789B01" {
		t.Errorf("expected vat_number 'NL123456789B01', got %v", u.VATNumber)
	}

	// Verify sync: tax_profiles.legal_form = tax_regime
	taxProfile, err := tc.taxVaultRepo.GetTaxProfile(context.Background(), user.CompanyID)
	if err != nil {
		t.Fatalf("failed to retrieve tax profile: %v", err)
	}
	if taxProfile.LegalForm != model.LegalFormEenmanszaak {
		t.Errorf("expected synced legal_form %q, got %q", model.LegalFormEenmanszaak, taxProfile.LegalForm)
	}

	// Verify sync: company_settings initialized
	settings, err := tc.settingsRepo.GetCompanySettings(context.Background(), user.CompanyID)
	if err != nil {
		t.Fatalf("failed to retrieve company settings: %v", err)
	}
	if settings.CompanyName == nil || *settings.CompanyName != "De Vries Bouw & Montage" {
		t.Errorf("expected company_name 'De Vries Bouw & Montage', got %v", settings.CompanyName)
	}
	if settings.VATNumber == nil || *settings.VATNumber != "NL123456789B01" {
		t.Errorf("expected vat_number 'NL123456789B01', got %v", settings.VATNumber)
	}
	if settings.Country == nil || *settings.Country != "NL" {
		t.Errorf("expected country 'NL', got %v", settings.Country)
	}
}

func TestOnboarding_UpdateProfile_ValidationErrors(t *testing.T) {
	tc := setupOnboardingTestApp()
	_, token := registerAndLogin(t, tc, "jan_validation@devriesbouw.nl", "SafePassword123!")

	testCases := []struct {
		name    string
		payload map[string]string
	}{
		{
			name:    "empty full_name",
			payload: map[string]string{"full_name": "   "},
		},
		{
			name:    "invalid phone_number",
			payload: map[string]string{"phone_number": "not-a-number"},
		},
		{
			name:    "invalid country code",
			payload: map[string]string{"country": "NED"},
		},
		{
			name:    "invalid tax regime",
			payload: map[string]string{"tax_regime": "corporation"},
		},
		{
			name:    "invalid dutch vat number",
			payload: map[string]string{"country": "NL", "vat_number": "NL1234"},
		},
	}

	for _, tcCase := range testCases {
		t.Run(tcCase.name, func(t *testing.T) {
			body, _ := json.Marshal(tcCase.payload)
			req := httptest.NewRequest(http.MethodPatch, "/api/v1/me/profile", bytes.NewReader(body))
			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()

			tc.mux.ServeHTTP(rr, req)

			if rr.Code != http.StatusUnprocessableEntity {
				t.Errorf("expected status 422 for %s, got %d: %s", tcCase.name, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestOnboarding_UpdateProfile_Unauthorized(t *testing.T) {
	tc := setupOnboardingTestApp()
	payload := map[string]string{"full_name": "Jan"}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/me/profile", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	tc.mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rr.Code)
	}
}

func TestOnboarding_EmailVerification_Flow(t *testing.T) {
	tc := setupOnboardingTestApp()
	user, token := registerAndLogin(t, tc, "verify_me@devries.nl", "SafePassword123!")

	// 1. Rate limiting on resend-verification (2nd call should fail with 429)
	req1 := httptest.NewRequest(http.MethodPost, "/api/v1/auth/resend-verification", nil)
	req1.Header.Set("Authorization", "Bearer "+token)
	rr1 := httptest.NewRecorder()
	tc.mux.ServeHTTP(rr1, req1)

	// Since register already creates a token at time.Now(), immediate resend should be rate-limited (429)
	if rr1.Code != http.StatusTooManyRequests {
		t.Fatalf("expected status 429 on immediate resend after register, got %d: %s", rr1.Code, rr1.Body.String())
	}

	// 2. Test verify-email with invalid token (must return 400 Bad Request, NOT 401)
	invBody, _ := json.Marshal(map[string]string{"token": "invalid_or_expired_token"})
	invReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/verify-email", bytes.NewReader(invBody))
	invReq.Header.Set("Content-Type", "application/json")
	invRR := httptest.NewRecorder()
	tc.mux.ServeHTTP(invRR, invReq)

	if invRR.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 on invalid token, got %d: %s", invRR.Code, invRR.Body.String())
	}

	// 3. Test verify-email with valid token
	plainToken := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	hasher := sha256.New()
	hasher.Write([]byte(plainToken))
	tokenHash := hex.EncodeToString(hasher.Sum(nil))

	verToken := &model.EmailVerificationToken{
		ID:        "tok_test_123",
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: time.Now().UTC().Add(24 * time.Hour),
		CreatedAt: time.Now().UTC(),
	}
	if err := tc.userRepo.SaveVerificationToken(context.Background(), verToken); err != nil {
		t.Fatalf("failed to insert test verification token: %v", err)
	}

	valBody, _ := json.Marshal(map[string]string{"token": plainToken})
	valReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/verify-email", bytes.NewReader(valBody))
	valReq.Header.Set("Content-Type", "application/json")
	valRR := httptest.NewRecorder()
	tc.mux.ServeHTTP(valRR, valReq)

	if valRR.Code != http.StatusOK {
		t.Fatalf("expected status 200 on valid token, got %d: %s", valRR.Code, valRR.Body.String())
	}

	var valResp struct {
		User model.User `json:"user"`
	}
	if err := json.Unmarshal(valRR.Body.Bytes(), &valResp); err != nil {
		t.Fatalf("failed to parse verify-email response: %v", err)
	}
	if !valResp.User.IsVerified {
		t.Errorf("expected user.is_verified to be true, got %v", valResp.User.IsVerified)
	}

	// 4. Token should be deleted after use -> verifying again should return 400 Bad Request
	reValReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/verify-email", bytes.NewReader(valBody))
	reValReq.Header.Set("Content-Type", "application/json")
	reValRR := httptest.NewRecorder()
	tc.mux.ServeHTTP(reValRR, reValReq)

	if reValRR.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 on reused token, got %d", reValRR.Code)
	}

	// 5. Calling resend-verification on already verified user returns 200 without error
	alreadyReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/resend-verification", nil)
	alreadyReq.Header.Set("Authorization", "Bearer "+token)
	alreadyRR := httptest.NewRecorder()
	tc.mux.ServeHTTP(alreadyRR, alreadyReq)

	if alreadyRR.Code != http.StatusOK {
		t.Fatalf("expected status 200 when resending for already verified user, got %d: %s", alreadyRR.Code, alreadyRR.Body.String())
	}
}

func TestOnboarding_SignUp_ReturnsNullBusinessName(t *testing.T) {
	tc := setupOnboardingTestApp()
	_, token := registerAndLogin(t, tc, "fresh_user@example.com", "SafePassword123!")

	// Call GET /api/v1/auth/me immediately after sign-up
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()
	tc.mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp struct {
		User map[string]any `json:"user"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode user: %v", err)
	}

	// Critical check: business_name MUST be null (never "Mijn Bedrijf" or missing)
	if resp.User["business_name"] != nil {
		t.Errorf("expected business_name to be null after sign-up, got %v", resp.User["business_name"])
	}
	if resp.User["legal_form"] != nil {
		t.Errorf("expected legal_form to be null after sign-up, got %v", resp.User["legal_form"])
	}
	if resp.User["country"] != "NL" {
		t.Errorf("expected country 'NL', got %v", resp.User["country"])
	}
	if resp.User["tax_regime"] != "NL_BTW_STANDARD" {
		t.Errorf("expected tax_regime 'NL_BTW_STANDARD', got %v", resp.User["tax_regime"])
	}
	if resp.User["role"] != "owner" {
		t.Errorf("expected role 'owner', got %v", resp.User["role"])
	}
}

func TestOnboarding_MemberCannotUpdateCompanyFields(t *testing.T) {
	tc := setupOnboardingTestApp()
	user, token := registerAndLogin(t, tc, "employee@example.com", "SafePassword123!")

	// Update user role to "member" in repo
	tc.userRepo.(*repository.MemoryUserRepository).SetUserRole(user.ID, "member")

	// 1. Member tries to update business_name -> 403 Forbidden
	namePayload := map[string]string{"business_name": "New Company Name"}
	nameBody, _ := json.Marshal(namePayload)
	req1 := httptest.NewRequest(http.MethodPatch, "/api/v1/me/profile", bytes.NewReader(nameBody))
	req1.Header.Set("Authorization", "Bearer "+token)
	req1.Header.Set("Content-Type", "application/json")
	rr1 := httptest.NewRecorder()
	tc.mux.ServeHTTP(rr1, req1)

	if rr1.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for member updating business_name, got %d: %s", rr1.Code, rr1.Body.String())
	}

	// 2. Member tries to update legal_form -> 403 Forbidden
	legalPayload := map[string]string{"legal_form": "bv"}
	legalBody, _ := json.Marshal(legalPayload)
	req2 := httptest.NewRequest(http.MethodPatch, "/api/v1/me/profile", bytes.NewReader(legalBody))
	req2.Header.Set("Authorization", "Bearer "+token)
	req2.Header.Set("Content-Type", "application/json")
	rr2 := httptest.NewRecorder()
	tc.mux.ServeHTTP(rr2, req2)

	if rr2.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for member updating legal_form, got %d: %s", rr2.Code, rr2.Body.String())
	}

	// 3. Member updates only personal fields (full_name and phone_number) -> 200 OK
	personalPayload := map[string]string{
		"full_name":    "Jan Employee",
		"phone_number": "06 1234 5678",
	}
	personalBody, _ := json.Marshal(personalPayload)
	req3 := httptest.NewRequest(http.MethodPatch, "/api/v1/me/profile", bytes.NewReader(personalBody))
	req3.Header.Set("Authorization", "Bearer "+token)
	req3.Header.Set("Content-Type", "application/json")
	rr3 := httptest.NewRecorder()
	tc.mux.ServeHTTP(rr3, req3)

	if rr3.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for member updating personal fields, got %d: %s", rr3.Code, rr3.Body.String())
	}

	var resp struct {
		User model.User `json:"user"`
	}
	if err := json.Unmarshal(rr3.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.User.FullName == nil || *resp.User.FullName != "Jan Employee" {
		t.Errorf("expected full_name 'Jan Employee', got %v", resp.User.FullName)
	}
	if resp.User.PhoneNumber == nil || *resp.User.PhoneNumber != "+31612345678" {
		t.Errorf("expected phone_number '+31612345678', got %v", resp.User.PhoneNumber)
	}
}

func TestOnboarding_TaxVault_UsesCompanyLegalForm(t *testing.T) {
	tc := setupOnboardingTestApp()
	_, token := registerAndLogin(t, tc, "tax_test@example.com", "SafePassword123!")

	// 1. Onboard with legal_form = "vof"
	payloadVOF := map[string]string{
		"business_name": "VOF Bouwbedrijf",
		"legal_form":    "vof",
	}
	bodyVOF, _ := json.Marshal(payloadVOF)
	req1 := httptest.NewRequest(http.MethodPatch, "/api/v1/me/profile", bytes.NewReader(bodyVOF))
	req1.Header.Set("Authorization", "Bearer "+token)
	req1.Header.Set("Content-Type", "application/json")
	rr1 := httptest.NewRecorder()
	tc.mux.ServeHTTP(rr1, req1)

	if rr1.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr1.Code, rr1.Body.String())
	}

	// 2. Tax profile GET should reflect "vof" from company
	reqProfile := httptest.NewRequest(http.MethodGet, "/api/v1/tax-profile", nil)
	reqProfile.Header.Set("Authorization", "Bearer "+token)
	rrProfile := httptest.NewRecorder()
	tc.mux.ServeHTTP(rrProfile, reqProfile)

	if rrProfile.Code != http.StatusOK {
		t.Fatalf("expected 200 for GET tax-profile, got %d: %s", rrProfile.Code, rrProfile.Body.String())
	}
	var profResp struct {
		Profile model.TaxProfile `json:"profile"`
	}
	if err := json.Unmarshal(rrProfile.Body.Bytes(), &profResp); err != nil {
		t.Fatalf("failed to decode tax profile: %v", err)
	}
	if profResp.Profile.LegalForm != model.LegalFormVOF {
		t.Errorf("expected legal_form 'vof', got %q", profResp.Profile.LegalForm)
	}

	// 3. Tax Vault overview should return status = "unavailable" with warning for VOF
	reqVault := httptest.NewRequest(http.MethodGet, "/api/v1/tax-vault?year=2026", nil)
	reqVault.Header.Set("Authorization", "Bearer "+token)
	rrVault := httptest.NewRecorder()
	tc.mux.ServeHTTP(rrVault, reqVault)

	if rrVault.Code != http.StatusOK {
		t.Fatalf("expected 200 for tax-vault overview, got %d: %s", rrVault.Code, rrVault.Body.String())
	}
	var vaultResp struct {
		IncomeTax struct {
			Status string `json:"status"`
		} `json:"income_tax"`
		Warnings []model.TaxWarning `json:"warnings"`
	}
	if err := json.Unmarshal(rrVault.Body.Bytes(), &vaultResp); err != nil {
		t.Fatalf("failed to decode tax-vault overview: %v", err)
	}
	if vaultResp.IncomeTax.Status != "unavailable" {
		t.Errorf("expected income_tax.status 'unavailable' for VOF, got %q", vaultResp.IncomeTax.Status)
	}
	hasUnsupportedWarning := false
	for _, w := range vaultResp.Warnings {
		if w.Code == "unsupported_legal_form" {
			hasUnsupportedWarning = true
			break
		}
	}
	if !hasUnsupportedWarning {
		t.Error("expected 'unsupported_legal_form' warning for VOF")
	}
}
