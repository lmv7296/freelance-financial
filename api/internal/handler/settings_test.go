package handler_test

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"go-freelancer/internal/model"
)

func TestCompanySettings_GetAndPatch(t *testing.T) {
	mux, _, token, _ := setupTestApp()

	// 1. GET initial company settings
	req := httptest.NewRequest(http.MethodGet, "/api/v1/settings/company", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	// 2. PATCH company settings with valid KvK, BTW, IBAN, Postal code
	companyName := "De Vries Timmerwerken B.V."
	tradeName := "De Vries Bouw"
	kvk := "12345678"
	vat := "NL123456789B01"
	iban := "NL91ABNA0417164300"
	postcode := "1012AB"
	city := "Amsterdam"
	street := "Keizersgracht 100"

	payload := model.CompanySettings{
		CompanyName: &companyName,
		TradeName:   &tradeName,
		KVKNumber:   &kvk,
		VATNumber:   &vat,
		IBAN:        &iban,
		PostalCode:  &postcode,
		City:        &city,
		Street:      &street,
	}
	b, _ := json.Marshal(payload)

	patchReq := httptest.NewRequest(http.MethodPatch, "/api/v1/settings/company", bytes.NewReader(b))
	patchReq.Header.Set("Authorization", "Bearer "+token)
	patchReq.Header.Set("Content-Type", "application/json")
	patchRR := httptest.NewRecorder()
	mux.ServeHTTP(patchRR, patchReq)

	if patchRR.Code != http.StatusOK {
		t.Fatalf("expected 200 for PATCH company, got %d: %s", patchRR.Code, patchRR.Body.String())
	}

	var resp struct {
		Company model.CompanySettings `json:"company"`
	}
	_ = json.Unmarshal(patchRR.Body.Bytes(), &resp)
	if resp.Company.CompanyName == nil || *resp.Company.CompanyName != companyName {
		t.Errorf("expected company_name %q, got %v", companyName, resp.Company.CompanyName)
	}
	if resp.Company.PostalCode == nil || *resp.Company.PostalCode != "1012 AB" {
		t.Errorf("expected normalized postal code '1012 AB', got %v", resp.Company.PostalCode)
	}

	// 3. Reject invalid KVK (7 digits)
	badKvk := "1234567"
	badPayload := model.CompanySettings{KVKNumber: &badKvk}
	bBad, _ := json.Marshal(badPayload)
	reqBad := httptest.NewRequest(http.MethodPatch, "/api/v1/settings/company", bytes.NewReader(bBad))
	reqBad.Header.Set("Authorization", "Bearer "+token)
	reqBad.Header.Set("Content-Type", "application/json")
	rrBad := httptest.NewRecorder()
	mux.ServeHTTP(rrBad, reqBad)

	if rrBad.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for bad KVK, got %d", rrBad.Code)
	}
}

func TestCompanySettings_LogoUpload(t *testing.T) {
	mux, _, token, _ := setupTestApp()

	// 1. Upload valid logo (PNG)
	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("logo", "logo.png")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}
	// 1x1 png bytes
	pngBytes := []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
		0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
		0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
		0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
		0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
	}
	_, _ = part.Write(pngBytes)
	_ = writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/settings/company/logo", body)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 for logo upload, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp struct {
		Company model.CompanySettings `json:"company"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp.Company.LogoURL == nil || *resp.Company.LogoURL != "/api/v1/settings/company/logo" {
		t.Errorf("expected logo_url /api/v1/settings/company/logo, got %v", resp.Company.LogoURL)
	}

	// 2. Fetch logo via GET /api/v1/settings/company/logo
	getLogoReq := httptest.NewRequest(http.MethodGet, "/api/v1/settings/company/logo", nil)
	getLogoReq.Header.Set("Authorization", "Bearer "+token)
	getLogoRR := httptest.NewRecorder()
	mux.ServeHTTP(getLogoRR, getLogoReq)

	if getLogoRR.Code != http.StatusOK {
		t.Fatalf("expected 200 for get logo, got %d", getLogoRR.Code)
	}
	if getLogoRR.Header().Get("Content-Type") != "image/png" {
		t.Errorf("expected Content-Type image/png, got %q", getLogoRR.Header().Get("Content-Type"))
	}

	// 3. Delete logo via DELETE /api/v1/settings/company/logo
	delLogoReq := httptest.NewRequest(http.MethodDelete, "/api/v1/settings/company/logo", nil)
	delLogoReq.Header.Set("Authorization", "Bearer "+token)
	delLogoRR := httptest.NewRecorder()
	mux.ServeHTTP(delLogoRR, delLogoReq)

	if delLogoRR.Code != http.StatusOK {
		t.Fatalf("expected 200 for delete logo, got %d", delLogoRR.Code)
	}
}

func TestInvoiceDefaults_GetAndPatch(t *testing.T) {
	mux, _, token, _ := setupTestApp()

	// 1. GET invoice defaults
	req := httptest.NewRequest(http.MethodGet, "/api/v1/settings/invoice-defaults", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	// 2. PATCH invoice defaults
	payload := model.InvoiceDefaults{
		PaymentTermDays: 30,
		NumberPrefix:    "FACT-2026-",
		NextNumber:      105,
		NumberPadding:   4,
		DefaultVatRate:  21,
	}
	b, _ := json.Marshal(payload)

	patchReq := httptest.NewRequest(http.MethodPatch, "/api/v1/settings/invoice-defaults", bytes.NewReader(b))
	patchReq.Header.Set("Authorization", "Bearer "+token)
	patchReq.Header.Set("Content-Type", "application/json")
	patchRR := httptest.NewRecorder()
	mux.ServeHTTP(patchRR, patchReq)

	if patchRR.Code != http.StatusOK {
		t.Fatalf("expected 200 for invoice defaults patch, got %d: %s", patchRR.Code, patchRR.Body.String())
	}

	var resp struct {
		InvoiceDefaults model.InvoiceDefaults `json:"invoice_defaults"`
	}
	_ = json.Unmarshal(patchRR.Body.Bytes(), &resp)
	if resp.InvoiceDefaults.NextNumber != 105 {
		t.Errorf("expected next_number 105, got %d", resp.InvoiceDefaults.NextNumber)
	}

	// 3. Reject next_number < 1
	badPayload := model.InvoiceDefaults{
		PaymentTermDays: 14,
		NextNumber:      0,
		DefaultVatRate:  21,
	}
	bBad, _ := json.Marshal(badPayload)
	badReq := httptest.NewRequest(http.MethodPatch, "/api/v1/settings/invoice-defaults", bytes.NewReader(bBad))
	badReq.Header.Set("Authorization", "Bearer "+token)
	badReq.Header.Set("Content-Type", "application/json")
	badRR := httptest.NewRecorder()
	mux.ServeHTTP(badRR, badReq)

	if badRR.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for next_number < 1, got %d", badRR.Code)
	}
}

func TestWhatsAppSettings_CRUD(t *testing.T) {
	mux, _, token, _ := setupTestApp()

	// 1. GET /api/v1/settings/whatsapp
	req := httptest.NewRequest(http.MethodGet, "/api/v1/settings/whatsapp", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 for whatsapp settings, got %d", rr.Code)
	}

	// 2. Add sender
	addPayload := map[string]string{
		"name":  "Kees Timmerman",
		"phone": "06 1234 5678",
	}
	b, _ := json.Marshal(addPayload)
	addReq := httptest.NewRequest(http.MethodPost, "/api/v1/settings/whatsapp/senders", bytes.NewReader(b))
	addReq.Header.Set("Authorization", "Bearer "+token)
	addReq.Header.Set("Content-Type", "application/json")
	addRR := httptest.NewRecorder()
	mux.ServeHTTP(addRR, addReq)

	if addRR.Code != http.StatusCreated {
		t.Fatalf("expected 201 for add sender, got %d: %s", addRR.Code, addRR.Body.String())
	}

	var senderResp struct {
		Sender model.WhatsAppSender `json:"sender"`
	}
	_ = json.Unmarshal(addRR.Body.Bytes(), &senderResp)
	if senderResp.Sender.Phone != "+31612345678" {
		t.Errorf("expected normalized phone +31612345678, got %s", senderResp.Sender.Phone)
	}

	// 3. Reject duplicate sender with 409 Conflict
	dupReq := httptest.NewRequest(http.MethodPost, "/api/v1/settings/whatsapp/senders", bytes.NewReader(b))
	dupReq.Header.Set("Authorization", "Bearer "+token)
	dupReq.Header.Set("Content-Type", "application/json")
	dupRR := httptest.NewRecorder()
	mux.ServeHTTP(dupRR, dupReq)

	if dupRR.Code != http.StatusConflict {
		t.Errorf("expected 409 for duplicate phone, got %d", dupRR.Code)
	}

	// 4. Update sender
	activeFalse := false
	newName := "Kees Schilder"
	updatePayload := map[string]any{
		"name":   newName,
		"active": activeFalse,
	}
	bUpd, _ := json.Marshal(updatePayload)
	updReq := httptest.NewRequest(http.MethodPatch, "/api/v1/settings/whatsapp/senders/"+senderResp.Sender.ID, bytes.NewReader(bUpd))
	updReq.Header.Set("Authorization", "Bearer "+token)
	updReq.Header.Set("Content-Type", "application/json")
	updRR := httptest.NewRecorder()
	mux.ServeHTTP(updRR, updReq)

	if updRR.Code != http.StatusOK {
		t.Fatalf("expected 200 for update sender, got %d", updRR.Code)
	}

	// 5. Delete sender
	delReq := httptest.NewRequest(http.MethodDelete, "/api/v1/settings/whatsapp/senders/"+senderResp.Sender.ID, nil)
	delReq.Header.Set("Authorization", "Bearer "+token)
	delRR := httptest.NewRecorder()
	mux.ServeHTTP(delRR, delReq)

	if delRR.Code != http.StatusOK {
		t.Fatalf("expected 200 for delete sender, got %d", delRR.Code)
	}
}

func TestUserPreferences_GetAndPatch(t *testing.T) {
	mux, _, token, _ := setupTestApp()

	// 1. GET preferences
	req := httptest.NewRequest(http.MethodGet, "/api/v1/me/preferences", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	// 2. PATCH preferences
	patchPayload := model.UserPreferences{
		Language: "en",
		Theme:    "dark",
		Notifications: model.NotificationPreferences{
			VatDeadlineReminder:       true,
			VatDeadlineDaysBefore:     3,
			ReceiptsToReview:          "instant",
			OverdueInvoices:           true,
			IncomeTaxDeadlineReminder: true,
		},
	}
	b, _ := json.Marshal(patchPayload)

	patchReq := httptest.NewRequest(http.MethodPatch, "/api/v1/me/preferences", bytes.NewReader(b))
	patchReq.Header.Set("Authorization", "Bearer "+token)
	patchReq.Header.Set("Content-Type", "application/json")
	patchRR := httptest.NewRecorder()
	mux.ServeHTTP(patchRR, patchReq)

	if patchRR.Code != http.StatusOK {
		t.Fatalf("expected 200 for patch preferences, got %d: %s", patchRR.Code, patchRR.Body.String())
	}

	var resp struct {
		Preferences model.UserPreferences `json:"preferences"`
	}
	_ = json.Unmarshal(patchRR.Body.Bytes(), &resp)
	if resp.Preferences.Language != "en" {
		t.Errorf("expected language en, got %s", resp.Preferences.Language)
	}
	if resp.Preferences.Theme != "dark" {
		t.Errorf("expected theme dark, got %s", resp.Preferences.Theme)
	}
	if resp.Preferences.Notifications.VatDeadlineDaysBefore != 3 {
		t.Errorf("expected 3 days, got %d", resp.Preferences.Notifications.VatDeadlineDaysBefore)
	}
}

func TestAccount_ChangeEmailAndPassword(t *testing.T) {
	mux, authSvc, token, _ := setupTestApp()

	// 1. Change email with wrong password -> 401
	wrongEmailPayload := map[string]string{
		"new_email":        "new@example.com",
		"current_password": "WrongPassword!",
	}
	b, _ := json.Marshal(wrongEmailPayload)
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/me/email", bytes.NewReader(b))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for wrong password, got %d", rr.Code)
	}

	// 2. Change email with correct password -> 200
	correctEmailPayload := map[string]string{
		"new_email":        "jan.nieuw@devries.nl",
		"current_password": "Password123!",
	}
	b2, _ := json.Marshal(correctEmailPayload)
	req2 := httptest.NewRequest(http.MethodPatch, "/api/v1/me/email", bytes.NewReader(b2))
	req2.Header.Set("Authorization", "Bearer "+token)
	req2.Header.Set("Content-Type", "application/json")
	rr2 := httptest.NewRecorder()
	mux.ServeHTTP(rr2, req2)

	if rr2.Code != http.StatusOK {
		t.Fatalf("expected 200 for email change, got %d: %s", rr2.Code, rr2.Body.String())
	}

	// 3. Change password with wrong password -> 401
	wrongPwPayload := map[string]string{
		"current_password": "WrongPassword!",
		"new_password":     "BrandNewPassword123!",
	}
	b3, _ := json.Marshal(wrongPwPayload)
	req3 := httptest.NewRequest(http.MethodPost, "/api/v1/auth/change-password", bytes.NewReader(b3))
	req3.Header.Set("Authorization", "Bearer "+token)
	req3.Header.Set("Content-Type", "application/json")
	rr3 := httptest.NewRecorder()
	mux.ServeHTTP(rr3, req3)

	if rr3.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for wrong password on change, got %d", rr3.Code)
	}

	// 4. Change password with short password (< 8 chars) -> 400
	shortPwPayload := map[string]string{
		"current_password": "Password123!",
		"new_password":     "short",
	}
	b4, _ := json.Marshal(shortPwPayload)
	req4 := httptest.NewRequest(http.MethodPost, "/api/v1/auth/change-password", bytes.NewReader(b4))
	req4.Header.Set("Authorization", "Bearer "+token)
	req4.Header.Set("Content-Type", "application/json")
	rr4 := httptest.NewRecorder()
	mux.ServeHTTP(rr4, req4)

	if rr4.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for short password, got %d", rr4.Code)
	}

	// 5. Change password successfully -> 200
	goodPwPayload := map[string]string{
		"current_password": "Password123!",
		"new_password":     "BrandNewPassword123!",
	}
	b5, _ := json.Marshal(goodPwPayload)
	req5 := httptest.NewRequest(http.MethodPost, "/api/v1/auth/change-password", bytes.NewReader(b5))
	req5.Header.Set("Authorization", "Bearer "+token)
	req5.Header.Set("Content-Type", "application/json")
	rr5 := httptest.NewRecorder()
	mux.ServeHTTP(rr5, req5)

	if rr5.Code != http.StatusOK {
		t.Fatalf("expected 200 for good password change, got %d: %s", rr5.Code, rr5.Body.String())
	}

	// 6. Test login with old password fails
	oldLogin := map[string]string{
		"email":    "jan.nieuw@devries.nl",
		"password": "Password123!",
	}
	bOld, _ := json.Marshal(oldLogin)
	reqOld := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(bOld))
	reqOld.Header.Set("Content-Type", "application/json")
	rrOld := httptest.NewRecorder()
	mux.ServeHTTP(rrOld, reqOld)

	if rrOld.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 with old password, got %d", rrOld.Code)
	}

	// 7. Test login with new password succeeds
	newLogin := map[string]string{
		"email":    "jan.nieuw@devries.nl",
		"password": "BrandNewPassword123!",
	}
	bNew, _ := json.Marshal(newLogin)
	reqNew := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(bNew))
	reqNew.Header.Set("Content-Type", "application/json")
	rrNew := httptest.NewRecorder()
	mux.ServeHTTP(rrNew, reqNew)

	if rrNew.Code != http.StatusOK {
		t.Errorf("expected 200 with new password, got %d", rrNew.Code)
	}

	// 8. Test LogoutAll
	logoutAllReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout-all", nil)
	logoutAllReq.Header.Set("Authorization", "Bearer "+token)
	logoutAllRR := httptest.NewRecorder()
	mux.ServeHTTP(logoutAllRR, logoutAllReq)

	if logoutAllRR.Code != http.StatusOK {
		t.Fatalf("expected 200 for logout-all, got %d", logoutAllRR.Code)
	}

	// Verify current token is now invalidated
	_, err := authSvc.ValidateSession(logoutAllReq.Context(), token)
	if err == nil {
		t.Error("expected token to be invalid after logout-all")
	}
}

