package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"go-freelancer/internal/model"
	"go-freelancer/internal/service"
)

func TestWhatsAppWebhookHandler(t *testing.T) {
	mux, _, token, _ := setupTestApp()
	authHeader := "Bearer " + token

	// 1. First add a WhatsApp sender via authenticated settings API
	senderReq := map[string]string{
		"name":  "Klaas Bouwer",
		"phone": "06 9876 5432",
	}
	body, _ := json.Marshal(senderReq)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/settings/whatsapp/senders", bytes.NewReader(body))
	req.Header.Set("Authorization", authHeader)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201 for adding sender, got %d: %s", rr.Code, rr.Body.String())
	}

	// 2. Webhook verification GET request (Meta webhook validation)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=test_challenge_123", nil)
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK || rr.Body.String() != "test_challenge_123" {
		t.Fatalf("expected 200 and challenge string, got code %d body %s", rr.Code, rr.Body.String())
	}

	// 3. Webhook POST request from registered sender
	wbReq := service.WhatsAppWebhookMessage{
		From:        "+31698765432",
		Type:        "image",
		Caption:     "Gamma bon voor verf",
		MediaBase64: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
		MimeType:    "image/jpeg",
	}
	wbBody, _ := json.Marshal(wbReq)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/whatsapp", bytes.NewReader(wbBody))
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusAccepted {
		t.Fatalf("expected 202 Accepted for whatsapp webhook, got %d: %s", rr.Code, rr.Body.String())
	}

	var res map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode webhook response: %v", err)
	}

	if res["status"] != "processing" {
		t.Fatalf("expected status processing, got %v", res["status"])
	}
	expID, ok := res["expense_id"].(string)
	if !ok || expID == "" {
		t.Fatalf("expected non-empty expense_id")
	}

	// 4. Verify expense is created in the company's expenses list
	req = httptest.NewRequest(http.MethodGet, "/api/v1/expenses/"+expID, nil)
	req.Header.Set("Authorization", authHeader)
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 fetching expense, got %d", rr.Code)
	}

	var expRes struct {
		Expense model.Expense `json:"expense"`
	}
	_ = json.NewDecoder(rr.Body).Decode(&expRes)
	if expRes.Expense.Source != "whatsapp" {
		t.Fatalf("expected source whatsapp, got %s", expRes.Expense.Source)
	}
}

