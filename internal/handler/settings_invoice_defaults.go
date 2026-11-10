package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"go-freelancer/internal/model"
	"go-freelancer/internal/service"
)

type invoiceDefaultsResponse struct {
	InvoiceDefaults *model.InvoiceDefaults `json:"invoice_defaults"`
}

// GetInvoiceDefaults handles GET /api/v1/settings/invoice-defaults.
func (h *Handler) GetInvoiceDefaults(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	defaults, err := h.settingsSvc.GetInvoiceDefaults(r.Context(), user.CompanyID)
	if err != nil {
		h.logger.Error("failed to get invoice defaults", "err", err, "company_id", user.CompanyID)
		h.WriteError(w, http.StatusInternalServerError, "failed to get invoice defaults")
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, invoiceDefaultsResponse{InvoiceDefaults: defaults})
}

// UpdateInvoiceDefaults handles PATCH /api/v1/settings/invoice-defaults.
func (h *Handler) UpdateInvoiceDefaults(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req model.InvoiceDefaults
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	updated, err := h.settingsSvc.UpdateInvoiceDefaults(r.Context(), user.CompanyID, &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidPaymentTermDays),
			errors.Is(err, service.ErrInvalidNextNumber),
			errors.Is(err, service.ErrInvalidVATRate):
			h.WriteError(w, http.StatusUnprocessableEntity, err.Error())
		default:
			h.logger.Error("failed to update invoice defaults", "err", err, "company_id", user.CompanyID)
			h.WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, invoiceDefaultsResponse{InvoiceDefaults: updated})
}

