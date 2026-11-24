package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"go-freelancer/internal/model"
)

// GetTaxProfile handles GET /api/v1/tax-profile
func (h *Handler) GetTaxProfile(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	profile, err := h.taxVaultSvc.GetTaxProfile(r.Context(), user.CompanyID)
	if err != nil {
		h.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, map[string]interface{}{"profile": profile})
}

// UpdateTaxProfile handles PUT /api/v1/tax-profile
func (h *Handler) UpdateTaxProfile(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var profile model.TaxProfile
	if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
		h.WriteError(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}

	updated, err := h.taxVaultSvc.UpdateTaxProfile(r.Context(), user.CompanyID, profile)
	if err != nil {
		h.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, map[string]interface{}{"profile": updated})
}

// GetTaxVaultOverview handles GET /api/v1/tax-vault?year=2026
func (h *Handler) GetTaxVaultOverview(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	yearStr := r.URL.Query().Get("year")
	year := 2026
	if yearStr != "" {
		if y, err := strconv.Atoi(yearStr); err == nil {
			year = y
		}
	}

	overview, err := h.taxVaultSvc.GetOverview(r.Context(), user.CompanyID, year)
	if err != nil {
		h.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, overview)
}

// GetExportOptions handles GET /api/v1/tax-vault/export-options
func (h *Handler) GetExportOptions(w http.ResponseWriter, r *http.Request) {
	options := h.taxVaultSvc.GetExportOptions()
	_ = h.WriteJSON(w, http.StatusOK, map[string]interface{}{"formats": options})
}

// GetTaxExports handles GET /api/v1/tax-vault/exports?year=2026
func (h *Handler) GetTaxExports(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	yearStr := r.URL.Query().Get("year")
	year := 2026
	if yearStr != "" {
		if y, err := strconv.Atoi(yearStr); err == nil {
			year = y
		}
	}

	exports, err := h.taxVaultSvc.GetTaxExports(r.Context(), user.CompanyID, year)
	if err != nil {
		h.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if exports == nil {
		exports = []model.TaxExport{}
	}

	_ = h.WriteJSON(w, http.StatusOK, map[string]interface{}{"exports": exports})
}

// CreateTaxExport handles POST /api/v1/tax-vault/exports
func (h *Handler) CreateTaxExport(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req model.CreateTaxExportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.TaxYear == 0 {
		req.TaxYear = 2026
	}
	if req.PeriodKey == "" {
		req.PeriodKey = "year"
	}
	if len(req.Formats) == 0 {
		req.Formats = []string{"xlsx"}
	}

	exp, err := h.taxVaultSvc.CreateTaxExport(r.Context(), user.CompanyID, req)
	if err != nil {
		h.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	_ = h.WriteJSON(w, http.StatusAccepted, map[string]interface{}{"export": exp})
}
