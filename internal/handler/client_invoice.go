package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
	"go-freelancer/internal/service"
)

type clientResponse struct {
	Client *model.Client `json:"client"`
}

type invoiceResponse struct {
	Invoice *model.Invoice `json:"invoice"`
}

// decodeJSONBody reads a JSON body of at most 1 MB into dst. It writes the
// 400 response itself and returns false when the body is unusable.
func (h *Handler) decodeJSONBody(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return false
	}
	return true
}

// writeClientInvoiceError maps service errors to HTTP responses.
func (h *Handler) writeClientInvoiceError(w http.ResponseWriter, err error, action, companyID string) {
	var validationErr *service.ValidationError
	switch {
	case errors.As(err, &validationErr):
		h.WriteError(w, http.StatusUnprocessableEntity, validationErr.Error())
	case errors.Is(err, repository.ErrClientNotFound):
		h.WriteError(w, http.StatusNotFound, "client not found")
	case errors.Is(err, repository.ErrInvoiceNotFound):
		h.WriteError(w, http.StatusNotFound, "invoice not found")
	default:
		h.logger.Error("failed to "+action, "err", err, "company_id", companyID)
		h.WriteError(w, http.StatusInternalServerError, "failed to "+action)
	}
}

// CreateClient handles POST /api/v1/clients.
func (h *Handler) CreateClient(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}
	var input model.ClientInput
	if !h.decodeJSONBody(w, r, &input) {
		return
	}
	client, err := h.clientInvSvc.CreateClient(r.Context(), user.CompanyID, &input)
	if err != nil {
		h.writeClientInvoiceError(w, err, "create client", user.CompanyID)
		return
	}
	_ = h.WriteJSON(w, http.StatusCreated, clientResponse{Client: client})
}

// UpdateClient handles PATCH /api/v1/clients/{id}. Fields left out stay unchanged.
func (h *Handler) UpdateClient(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}
	var input model.ClientInput
	if !h.decodeJSONBody(w, r, &input) {
		return
	}
	client, err := h.clientInvSvc.UpdateClient(r.Context(), user.CompanyID, r.PathValue("id"), &input)
	if err != nil {
		h.writeClientInvoiceError(w, err, "update client", user.CompanyID)
		return
	}
	_ = h.WriteJSON(w, http.StatusOK, clientResponse{Client: client})
}

// CreateInvoice handles POST /api/v1/invoices.
func (h *Handler) CreateInvoice(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}
	var req model.CreateInvoiceRequest
	if !h.decodeJSONBody(w, r, &req) {
		return
	}
	invoice, err := h.clientInvSvc.CreateInvoice(r.Context(), user.CompanyID, &req)
	if err != nil {
		h.writeClientInvoiceError(w, err, "create invoice", user.CompanyID)
		return
	}
	_ = h.WriteJSON(w, http.StatusCreated, invoiceResponse{Invoice: invoice})
}

// UpdateInvoice handles PATCH /api/v1/invoices/{id} (status, due date, payment date).
func (h *Handler) UpdateInvoice(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}
	var req model.UpdateInvoiceRequest
	if !h.decodeJSONBody(w, r, &req) {
		return
	}
	invoice, err := h.clientInvSvc.UpdateInvoice(r.Context(), user.CompanyID, r.PathValue("id"), &req)
	if err != nil {
		h.writeClientInvoiceError(w, err, "update invoice", user.CompanyID)
		return
	}
	_ = h.WriteJSON(w, http.StatusOK, invoiceResponse{Invoice: invoice})
}

type listClientsResponse struct {
	Clients []*model.Client `json:"clients"`
}

type listInvoicesResponse struct {
	Invoices []*model.Invoice `json:"invoices"`
}

// ListClients handles GET /api/v1/clients.
func (h *Handler) ListClients(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	clients, err := h.expenseSvc.ListClients(r.Context(), user.CompanyID)
	if err != nil {
		h.logger.Error("failed to list clients", "err", err, "company_id", user.CompanyID)
		h.WriteError(w, http.StatusInternalServerError, "failed to list clients")
		return
	}

	if clients == nil {
		clients = []*model.Client{}
	}

	_ = h.WriteJSON(w, http.StatusOK, listClientsResponse{Clients: clients})
}

// ListInvoices handles GET /api/v1/invoices.
func (h *Handler) ListInvoices(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var clientID *string
	if cid := r.URL.Query().Get("client_id"); cid != "" {
		clientID = &cid
	}

	invoices, err := h.expenseSvc.ListInvoices(r.Context(), user.CompanyID, clientID)
	if err != nil {
		h.logger.Error("failed to list invoices", "err", err, "company_id", user.CompanyID)
		h.WriteError(w, http.StatusInternalServerError, "failed to list invoices")
		return
	}

	if invoices == nil {
		invoices = []*model.Invoice{}
	}

	_ = h.WriteJSON(w, http.StatusOK, listInvoicesResponse{Invoices: invoices})
}

