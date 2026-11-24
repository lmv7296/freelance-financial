package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go-freelancer/internal/model"
)

// doJSON sends a request with an optional JSON body and returns the recorder.
func doJSON(t *testing.T, mux http.Handler, method, path, token string, payload any) *httptest.ResponseRecorder {
	t.Helper()
	var body *bytes.Reader
	if payload != nil {
		b, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("marshal payload: %v", err)
		}
		body = bytes.NewReader(b)
	} else {
		body = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, body)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	return rr
}

func decode[T any](t *testing.T, rr *httptest.ResponseRecorder) T {
	t.Helper()
	var v T
	if err := json.Unmarshal(rr.Body.Bytes(), &v); err != nil {
		t.Fatalf("decode %s: %v", rr.Body.String(), err)
	}
	return v
}

// registerUser signs up and logs in another user (with their own company).
func registerUser(t *testing.T, mux http.Handler, email string) string {
	t.Helper()
	creds := map[string]string{"email": email, "password": "Password123!"}
	doJSON(t, mux, http.MethodPost, "/api/v1/auth/register", "", creds)
	rr := doJSON(t, mux, http.MethodPost, "/api/v1/auth/login", "", creds)
	resp := decode[struct {
		Token string `json:"token"`
	}](t, rr)
	if resp.Token == "" {
		t.Fatalf("login for %s returned no token: %s", email, rr.Body.String())
	}
	return resp.Token
}

func createClient(t *testing.T, mux http.Handler, token string, payload map[string]any) model.Client {
	t.Helper()
	rr := doJSON(t, mux, http.MethodPost, "/api/v1/clients", token, payload)
	if rr.Code != http.StatusCreated {
		t.Fatalf("POST /clients: expected 201, got %d: %s", rr.Code, rr.Body.String())
	}
	return decode[struct {
		Client model.Client `json:"client"`
	}](t, rr).Client
}

func TestClientEndpoints(t *testing.T) {
	mux, _, token, _ := setupTestApp()

	business := createClient(t, mux, token, map[string]any{
		"type":           "bedrijf",
		"name":           "  Bakkerij Jansen B.V. ",
		"email":          "info@bakkerijjansen.nl",
		"phone":          "06 1234 5678",
		"kvk_number":     "12345678",
		"vat_number":     "nl123456789b01",
		"contact_person": "Piet Jansen",
		"address_line1":  "Dorpsstraat 1",
		"address_line2":  "1234 AB Utrecht",
	})
	if business.ID == "" || business.Name != "Bakkerij Jansen B.V." {
		t.Fatalf("unexpected client: %+v", business)
	}
	if business.Phone != "+31612345678" {
		t.Errorf("phone should be normalised to E.164, got %q", business.Phone)
	}
	if business.VatNumber != "NL123456789B01" {
		t.Errorf("vat number should be upper-cased, got %q", business.VatNumber)
	}

	// Business-only fields are dropped for a private client
	private := createClient(t, mux, token, map[string]any{
		"name":       "Anna de Vries",
		"kvk_number": "87654321",
	})
	if private.Type != model.ClientTypePrivate || private.KvkNumber != "" {
		t.Errorf("private client should default to particulier without KvK, got %+v", private)
	}

	// Listed alphabetically
	rr := doJSON(t, mux, http.MethodGet, "/api/v1/clients", token, nil)
	list := decode[struct {
		Clients []model.Client `json:"clients"`
	}](t, rr).Clients
	if len(list) != 2 || list[0].Name != "Anna de Vries" || list[1].Name != "Bakkerij Jansen B.V." {
		t.Fatalf("unexpected client list: %+v", list)
	}

	// PATCH changes only the given fields
	rr = doJSON(t, mux, http.MethodPatch, "/api/v1/clients/"+business.ID, token, map[string]any{
		"site_note": "Achterom via de steeg",
	})
	if rr.Code != http.StatusOK {
		t.Fatalf("PATCH /clients/{id}: expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
	updated := decode[struct {
		Client model.Client `json:"client"`
	}](t, rr).Client
	if updated.SiteNote != "Achterom via de steeg" || updated.Email != "info@bakkerijjansen.nl" {
		t.Errorf("PATCH should keep other fields, got %+v", updated)
	}

	invalid := []struct {
		name    string
		payload map[string]any
	}{
		{"missing name", map[string]any{"type": "bedrijf"}},
		{"unknown type", map[string]any{"name": "X", "type": "vereniging"}},
		{"bad email", map[string]any{"name": "X", "email": "not-an-email"}},
		{"bad kvk", map[string]any{"name": "X", "type": "bedrijf", "kvk_number": "123"}},
		{"bad phone", map[string]any{"name": "X", "phone": "12"}},
	}
	for _, tc := range invalid {
		rr := doJSON(t, mux, http.MethodPost, "/api/v1/clients", token, tc.payload)
		if rr.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s: expected 422, got %d: %s", tc.name, rr.Code, rr.Body.String())
		}
	}

	if rr := doJSON(t, mux, http.MethodPatch, "/api/v1/clients/cli_missing", token, map[string]any{"name": "X"}); rr.Code != http.StatusNotFound {
		t.Errorf("PATCH unknown client: expected 404, got %d", rr.Code)
	}
	if rr := doJSON(t, mux, http.MethodPost, "/api/v1/clients", "", map[string]any{"name": "X"}); rr.Code != http.StatusUnauthorized {
		t.Errorf("POST without token: expected 401, got %d", rr.Code)
	}
}

func TestInvoiceEndpoints(t *testing.T) {
	mux, _, token, _ := setupTestApp()
	client := createClient(t, mux, token, map[string]any{"name": "Jan de Vries"})

	lines := []map[string]any{
		{"description": "Arbeid", "quantity": 2, "unit_price_cents": 6500},
		{"description": "Materiaal", "quantity": 1, "unit_price_cents": 4500},
	}

	rr := doJSON(t, mux, http.MethodPost, "/api/v1/invoices", token, map[string]any{
		"client_id":      client.ID,
		"issue_date":     "2026-11-02",
		"payment_method": "Tikkie / iDEAL QR",
		"vat_rate":       21,
		"line_items":     lines,
	})
	if rr.Code != http.StatusCreated {
		t.Fatalf("POST /invoices: expected 201, got %d: %s", rr.Code, rr.Body.String())
	}
	first := decode[struct {
		Invoice model.Invoice `json:"invoice"`
	}](t, rr).Invoice

	// Totals come from the lines: 2×65 + 45 = 175, VAT 21% = 36.75
	if first.SubtotalCents != 17500 || first.VatAmountCents != 3675 || first.TotalCents != 21175 {
		t.Errorf("unexpected totals: subtotal %d, vat %d, total %d", first.SubtotalCents, first.VatAmountCents, first.TotalCents)
	}
	if first.LineItems[0].TotalCents != 13000 {
		t.Errorf("line total should be quantity × price, got %d", first.LineItems[0].TotalCents)
	}
	if first.InvoiceNumber != "INV-2026-0001" {
		t.Errorf("expected first number from the default settings, got %q", first.InvoiceNumber)
	}
	if first.Status != model.InvoiceStatusSent || first.DueDate != "2026-11-16" {
		t.Errorf("expected SENT due 14 days after issue, got %s due %s", first.Status, first.DueDate)
	}
	if first.ClientName != "Jan de Vries" {
		t.Errorf("expected client name on the invoice, got %q", first.ClientName)
	}

	// The next invoice gets the next number, and the setting moves along
	rr = doJSON(t, mux, http.MethodPost, "/api/v1/invoices", token, map[string]any{
		"client_id": client.ID, "status": "DRAFT", "line_items": lines,
	})
	second := decode[struct {
		Invoice model.Invoice `json:"invoice"`
	}](t, rr).Invoice
	if rr.Code != http.StatusCreated || second.InvoiceNumber != "INV-2026-0002" || second.Status != model.InvoiceStatusDraft {
		t.Fatalf("second invoice: got %d %+v", rr.Code, second)
	}
	if second.IssueDate == "" || second.IssueDate > time.Now().AddDate(0, 0, 1).Format(time.DateOnly) {
		t.Errorf("issue date should default to today, got %q", second.IssueDate)
	}
	rr = doJSON(t, mux, http.MethodGet, "/api/v1/settings/invoice-defaults", token, nil)
	defaults := decode[struct {
		InvoiceDefaults model.InvoiceDefaults `json:"invoice_defaults"`
	}](t, rr).InvoiceDefaults
	if defaults.NextNumber != 3 {
		t.Errorf("expected next_number 3 after two invoices, got %d", defaults.NextNumber)
	}

	invalid := []struct {
		name    string
		payload map[string]any
	}{
		{"duplicate number", map[string]any{"client_id": client.ID, "invoice_number": "inv-2026-0001", "line_items": lines}},
		{"unknown client", map[string]any{"client_id": "cli_missing", "line_items": lines}},
		{"no lines", map[string]any{"client_id": client.ID, "line_items": []any{}}},
		{"zero quantity", map[string]any{"client_id": client.ID, "line_items": []map[string]any{{"quantity": 0, "unit_price_cents": 100}}}},
		{"cancelled on create", map[string]any{"client_id": client.ID, "status": "CANCELLED", "line_items": lines}},
		{"due before issue", map[string]any{"client_id": client.ID, "issue_date": "2026-11-10", "due_date": "2026-11-01", "line_items": lines}},
		{"bad date", map[string]any{"client_id": client.ID, "issue_date": "10-11-2026", "line_items": lines}},
		{"vat out of range", map[string]any{"client_id": client.ID, "vat_rate": 121, "line_items": lines}},
	}
	for _, tc := range invalid {
		rr := doJSON(t, mux, http.MethodPost, "/api/v1/invoices", token, tc.payload)
		if rr.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s: expected 422, got %d: %s", tc.name, rr.Code, rr.Body.String())
		}
	}

	// Mark the first invoice paid
	rr = doJSON(t, mux, http.MethodPatch, "/api/v1/invoices/"+first.ID, token, map[string]any{
		"status": "PAID", "paid_at": "2026-11-05",
	})
	if rr.Code != http.StatusOK {
		t.Fatalf("PATCH /invoices/{id}: expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
	paid := decode[struct {
		Invoice model.Invoice `json:"invoice"`
	}](t, rr).Invoice
	if paid.Status != model.InvoiceStatusPaid || paid.PaidAt == nil || *paid.PaidAt != "2026-11-05" {
		t.Errorf("expected PAID on 2026-11-05, got %s %v", paid.Status, paid.PaidAt)
	}

	// Back to SENT clears the payment date
	rr = doJSON(t, mux, http.MethodPatch, "/api/v1/invoices/"+first.ID, token, map[string]any{"status": "SENT"})
	reopened := decode[struct {
		Invoice model.Invoice `json:"invoice"`
	}](t, rr).Invoice
	if reopened.PaidAt != nil {
		t.Errorf("a SENT invoice should have no paid_at, got %v", *reopened.PaidAt)
	}

	if rr := doJSON(t, mux, http.MethodPatch, "/api/v1/invoices/"+first.ID, token, map[string]any{"status": "LOST"}); rr.Code != http.StatusUnprocessableEntity {
		t.Errorf("PATCH unknown status: expected 422, got %d", rr.Code)
	}
	if rr := doJSON(t, mux, http.MethodPatch, "/api/v1/invoices/inv_missing", token, map[string]any{"status": "PAID"}); rr.Code != http.StatusNotFound {
		t.Errorf("PATCH unknown invoice: expected 404, got %d", rr.Code)
	}

	// The list returns the line items and newest first
	rr = doJSON(t, mux, http.MethodGet, "/api/v1/invoices", token, nil)
	list := decode[struct {
		Invoices []model.Invoice `json:"invoices"`
	}](t, rr).Invoices
	if len(list) != 2 {
		t.Fatalf("expected 2 invoices, got %d", len(list))
	}
	if list[0].ID != second.ID || len(list[1].LineItems) != 2 {
		t.Errorf("unexpected list order or line items: %+v", list)
	}
}

func TestClientsAndInvoices_AreScopedToTheCompany(t *testing.T) {
	mux, _, ownerToken, _ := setupTestApp()
	client := createClient(t, mux, ownerToken, map[string]any{"name": "Klant van Jan"})

	otherToken := registerUser(t, mux, "piet@example.nl")

	rr := doJSON(t, mux, http.MethodGet, "/api/v1/clients", otherToken, nil)
	if list := decode[struct {
		Clients []model.Client `json:"clients"`
	}](t, rr).Clients; len(list) != 0 {
		t.Fatalf("another company must not see these clients, got %+v", list)
	}
	if rr := doJSON(t, mux, http.MethodPatch, "/api/v1/clients/"+client.ID, otherToken, map[string]any{"name": "Gekaapt"}); rr.Code != http.StatusNotFound {
		t.Errorf("PATCH another company's client: expected 404, got %d", rr.Code)
	}
	rr = doJSON(t, mux, http.MethodPost, "/api/v1/invoices", otherToken, map[string]any{
		"client_id":  client.ID,
		"line_items": []map[string]any{{"quantity": 1, "unit_price_cents": 100}},
	})
	if rr.Code != http.StatusUnprocessableEntity {
		t.Errorf("invoice for another company's client: expected 422, got %d", rr.Code)
	}
}
