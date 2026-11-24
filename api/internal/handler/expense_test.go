package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go-freelancer/internal/model"
)

func TestExpenseEndpoints_CRUD(t *testing.T) {
	mux, _, token, _ := setupTestApp()

	// 1. Create expense via POST /api/v1/expenses
	createPayload := map[string]any{
		"merchant_name":  "Hornbach Den Haag",
		"receipt_date":   "2026-06-20",
		"payment_method": "PIN / Betaalpas",
		"category":       "Bouwmaterialen & Onderdelen",
		"subtotal_amount": 82.64,
		"vat_amount":     17.36,
		"total_amount":   100.00,
		"notes":          "Verf en kwasten",
		"receipt_url":    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
	}
	body, _ := json.Marshal(createPayload)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/expenses", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("expected POST status 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var createResp struct {
		Expense model.Expense `json:"expense"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &createResp); err != nil {
		t.Fatalf("failed to decode create response: %v", err)
	}

	created := createResp.Expense
	if created.MerchantName != "Hornbach Den Haag" {
		t.Errorf("expected Hornbach Den Haag, got %s", created.MerchantName)
	}
	if created.TotalAmount != 100.00 {
		t.Errorf("expected total amount 100.00, got %f", created.TotalAmount)
	}
	if !strings.HasPrefix(created.ReceiptURL, "/api/v1/receipts/") {
		t.Errorf("expected receipt URL to be local path, got %q", created.ReceiptURL)
	}

	// 2. Fetch created receipt file via GET /api/v1/receipts/:id
	receiptPath := created.ReceiptURL
	receiptReq := httptest.NewRequest(http.MethodGet, receiptPath, nil)
	receiptReq.Header.Set("Authorization", "Bearer "+token)
	receiptRR := httptest.NewRecorder()
	mux.ServeHTTP(receiptRR, receiptReq)

	if receiptRR.Code != http.StatusOK {
		t.Fatalf("expected status 200 for receipt download, got %d", receiptRR.Code)
	}
	if receiptRR.Header().Get("Content-Type") != "image/png" {
		t.Errorf("expected Content-Type image/png, got %q", receiptRR.Header().Get("Content-Type"))
	}

	// 3. GET /api/v1/expenses/:id
	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/expenses/"+created.ID, nil)
	getReq.Header.Set("Authorization", "Bearer "+token)
	getRR := httptest.NewRecorder()
	mux.ServeHTTP(getRR, getReq)

	if getRR.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", getRR.Code)
	}

	// 4. PATCH /api/v1/expenses/:id (update status and category)
	patchStatus := model.ExpenseStatusNeedsReview
	patchCat := "Gereedschap & Apparatuur"
	patchPayload := map[string]any{
		"status":   patchStatus,
		"category": patchCat,
	}
	patchBody, _ := json.Marshal(patchPayload)
	patchReq := httptest.NewRequest(http.MethodPatch, "/api/v1/expenses/"+created.ID, bytes.NewReader(patchBody))
	patchReq.Header.Set("Authorization", "Bearer "+token)
	patchReq.Header.Set("Content-Type", "application/json")
	patchRR := httptest.NewRecorder()
	mux.ServeHTTP(patchRR, patchReq)

	if patchRR.Code != http.StatusOK {
		t.Fatalf("expected status 200 for PATCH, got %d: %s", patchRR.Code, patchRR.Body.String())
	}

	var patchResp struct {
		Expense model.Expense `json:"expense"`
	}
	_ = json.Unmarshal(patchRR.Body.Bytes(), &patchResp)
	if patchResp.Expense.Status != model.ExpenseStatusNeedsReview {
		t.Errorf("expected updated status needs_review, got %s", patchResp.Expense.Status)
	}
	if patchResp.Expense.Category == nil || *patchResp.Expense.Category != "Gereedschap & Apparatuur" {
		t.Errorf("expected updated category, got %v", patchResp.Expense.Category)
	}

	// 5. GET /api/v1/expenses (list)
	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/expenses", nil)
	listReq.Header.Set("Authorization", "Bearer "+token)
	listRR := httptest.NewRecorder()
	mux.ServeHTTP(listRR, listReq)

	if listRR.Code != http.StatusOK {
		t.Fatalf("expected status 200 for list, got %d", listRR.Code)
	}

	var listResp struct {
		Expenses []model.Expense `json:"expenses"`
	}
	_ = json.Unmarshal(listRR.Body.Bytes(), &listResp)
	if len(listResp.Expenses) != 1 {
		t.Fatalf("expected 1 expense in list, got %d", len(listResp.Expenses))
	}

	// 6. DELETE /api/v1/expenses/:id
	delReq := httptest.NewRequest(http.MethodDelete, "/api/v1/expenses/"+created.ID, nil)
	delReq.Header.Set("Authorization", "Bearer "+token)
	delRR := httptest.NewRecorder()
	mux.ServeHTTP(delRR, delReq)

	if delRR.Code != http.StatusOK {
		t.Fatalf("expected status 200 for delete, got %d", delRR.Code)
	}

	// 7. Verify 404 after delete
	verifyReq := httptest.NewRequest(http.MethodGet, "/api/v1/expenses/"+created.ID, nil)
	verifyReq.Header.Set("Authorization", "Bearer "+token)
	verifyRR := httptest.NewRecorder()
	mux.ServeHTTP(verifyRR, verifyReq)

	if verifyRR.Code != http.StatusNotFound {
		t.Errorf("expected 404 after delete, got %d", verifyRR.Code)
	}
}

func TestClientsAndInvoicesEndpoints(t *testing.T) {
	mux, _, token, _ := setupTestApp()

	// GET /api/v1/clients
	req := httptest.NewRequest(http.MethodGet, "/api/v1/clients", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 for /clients, got %d", rr.Code)
	}

	var clientResp struct {
		Clients []model.Client `json:"clients"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &clientResp); err != nil {
		t.Fatalf("failed to decode clients: %v", err)
	}
	if clientResp.Clients == nil {
		t.Error("expected non-nil clients array")
	}

	// GET /api/v1/invoices
	invReq := httptest.NewRequest(http.MethodGet, "/api/v1/invoices", nil)
	invReq.Header.Set("Authorization", "Bearer "+token)
	invRR := httptest.NewRecorder()
	mux.ServeHTTP(invRR, invReq)

	if invRR.Code != http.StatusOK {
		t.Fatalf("expected 200 for /invoices, got %d", invRR.Code)
	}

	var invResp struct {
		Invoices []model.Invoice `json:"invoices"`
	}
	if err := json.Unmarshal(invRR.Body.Bytes(), &invResp); err != nil {
		t.Fatalf("failed to decode invoices: %v", err)
	}
	if invResp.Invoices == nil {
		t.Error("expected non-nil invoices array")
	}
}

func TestExpenseEndpoints_Unauthorized(t *testing.T) {
	mux, _, _, _ := setupTestApp()

	endpoints := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/api/v1/expenses"},
		{http.MethodPost, "/api/v1/expenses"},
		{http.MethodGet, "/api/v1/expenses/some-id"},
		{http.MethodPatch, "/api/v1/expenses/some-id"},
		{http.MethodDelete, "/api/v1/expenses/some-id"},
		{http.MethodGet, "/api/v1/receipts/some-receipt"},
		{http.MethodGet, "/api/v1/clients"},
		{http.MethodGet, "/api/v1/invoices"},
	}

	for _, ep := range endpoints {
		t.Run(ep.method+" "+ep.path, func(t *testing.T) {
			req := httptest.NewRequest(ep.method, ep.path, nil)
			rr := httptest.NewRecorder()
			mux.ServeHTTP(rr, req)

			if rr.Code != http.StatusUnauthorized {
				t.Errorf("expected 401 for unauthorized %s %s, got %d", ep.method, ep.path, rr.Code)
			}
		})
	}
}

