package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
)

func TestTaxVaultEndpoints(t *testing.T) {
	mux, _, token, _ := setupTestApp()

	// Seed tax rules
	jsonPath := "/Users/lorenzo/freelanc-financial/freelance-financial/docs/tax-rules-2026-nl.json"
	absPath, err := filepath.Abs(jsonPath)
	if err == nil {
		if rules, err := repository.LoadTaxRulesFromJSONFile(absPath); err == nil {
			_ = repository.NewMemoryTaxVaultRepository().SeedTaxRules(context.Background(), rules)
		}
	}

	authHeader := "Bearer " + token

	// 1. GET /api/v1/tax-profile
	req := httptest.NewRequest(http.MethodGet, "/api/v1/tax-profile", nil)
	req.Header.Set("Authorization", authHeader)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 for GET /api/v1/tax-profile, got %d", rr.Code)
	}

	var profRes struct {
		Profile model.TaxProfile `json:"profile"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&profRes); err != nil {
		t.Fatalf("decode profile: %v", err)
	}
	if profRes.Profile.LegalForm != model.LegalFormEenmanszaak {
		t.Fatalf("expected default legal form eenmanszaak, got %s", profRes.Profile.LegalForm)
	}

	// 2. PUT /api/v1/tax-profile
	hoursTrue := true
	updateProfile := profRes.Profile
	updateProfile.MeetsHoursCriterion = &hoursTrue
	updateProfile.IsStarter = true

	profBody, _ := json.Marshal(updateProfile)
	req = httptest.NewRequest(http.MethodPut, "/api/v1/tax-profile", bytes.NewReader(profBody))
	req.Header.Set("Authorization", authHeader)
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 for PUT /api/v1/tax-profile, got %d: %s", rr.Code, rr.Body.String())
	}

	// 3. GET /api/v1/tax-vault?year=2026
	req = httptest.NewRequest(http.MethodGet, "/api/v1/tax-vault?year=2026", nil)
	req.Header.Set("Authorization", authHeader)
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 for GET /api/v1/tax-vault, got %d", rr.Code)
	}

	// 4. GET /api/v1/tax-vault/export-options
	req = httptest.NewRequest(http.MethodGet, "/api/v1/tax-vault/export-options", nil)
	req.Header.Set("Authorization", authHeader)
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 for GET /api/v1/tax-vault/export-options, got %d", rr.Code)
	}

	// 5. POST /api/v1/tax-vault/exports
	expReq := model.CreateTaxExportRequest{
		TaxYear:          2026,
		PeriodKey:        "year",
		Formats:          []string{"xlsx", "receipts_zip"},
		SendToAccountant: false,
		SaveAsDefault:    true,
	}
	expBody, _ := json.Marshal(expReq)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/tax-vault/exports", bytes.NewReader(expBody))
	req.Header.Set("Authorization", authHeader)
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusAccepted {
		t.Fatalf("expected 202 for POST /api/v1/tax-vault/exports, got %d", rr.Code)
	}

	// 6. GET /api/v1/tax-vault/exports?year=2026
	req = httptest.NewRequest(http.MethodGet, "/api/v1/tax-vault/exports?year=2026", nil)
	req.Header.Set("Authorization", authHeader)
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 for GET /api/v1/tax-vault/exports, got %d", rr.Code)
	}
}

