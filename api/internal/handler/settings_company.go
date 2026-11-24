package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"go-freelancer/internal/model"
	"go-freelancer/internal/service"
)

type companyResponse struct {
	Company *model.CompanySettings `json:"company"`
}

// GetCompany handles GET /api/v1/settings/company.
func (h *Handler) GetCompany(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	company, err := h.settingsSvc.GetCompanySettings(r.Context(), user.CompanyID)
	if err != nil {
		h.logger.Error("failed to get company settings", "err", err, "company_id", user.CompanyID)
		h.WriteError(w, http.StatusInternalServerError, "failed to get company settings")
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, companyResponse{Company: company})
}

// UpdateCompany handles PATCH /api/v1/settings/company.
func (h *Handler) UpdateCompany(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req model.CompanySettings
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	updated, err := h.settingsSvc.UpdateCompanySettings(r.Context(), user.CompanyID, &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidKVK),
			errors.Is(err, service.ErrInvalidVAT),
			errors.Is(err, service.ErrInvalidPostalCode),
			errors.Is(err, service.ErrInvalidIBAN):
			h.WriteError(w, http.StatusUnprocessableEntity, err.Error())
		default:
			h.logger.Error("failed to update company settings", "err", err, "company_id", user.CompanyID)
			h.WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, companyResponse{Company: updated})
}

// UploadLogo handles POST /api/v1/settings/company/logo.
func (h *Handler) UploadLogo(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	// 2MB max
	if err := r.ParseMultipartForm(2 << 20); err != nil {
		h.WriteError(w, http.StatusBadRequest, "failed to parse multipart form or file too large: "+err.Error())
		return
	}

	file, header, err := r.FormFile("logo")
	if err != nil {
		h.WriteError(w, http.StatusBadRequest, "multipart field 'logo' is required")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, 2<<20+1))
	if err != nil {
		h.WriteError(w, http.StatusBadRequest, "failed to read uploaded file")
		return
	}

	updated, err := h.settingsSvc.UploadLogo(r.Context(), user.CompanyID, header.Filename, data)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrLogoTooLarge),
			errors.Is(err, service.ErrUnsupportedLogoType),
			errors.Is(err, service.ErrInvalidSVG):
			h.WriteError(w, http.StatusUnprocessableEntity, err.Error())
		default:
			h.logger.Error("failed to upload logo", "err", err, "company_id", user.CompanyID)
			h.WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, companyResponse{Company: updated})
}

// DeleteLogo handles DELETE /api/v1/settings/company/logo.
func (h *Handler) DeleteLogo(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	updated, err := h.settingsSvc.DeleteLogo(r.Context(), user.CompanyID)
	if err != nil {
		h.logger.Error("failed to delete logo", "err", err, "company_id", user.CompanyID)
		h.WriteError(w, http.StatusInternalServerError, "failed to delete logo")
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, companyResponse{Company: updated})
}

// GetLogo handles GET /api/v1/settings/company/logo.
// Streams the company's uploaded logo directly to the browser.
func (h *Handler) GetLogo(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	logoDir := filepath.Join("./uploads/logos", user.CompanyID)
	files, err := os.ReadDir(logoDir)
	if err != nil || len(files) == 0 {
		h.WriteError(w, http.StatusNotFound, "logo not found")
		return
	}

	filename := files[0].Name()
	filePath := filepath.Join(logoDir, filename)
	ext := filepath.Ext(filename)

	var contentType string
	switch ext {
	case ".png":
		contentType = "image/png"
	case ".jpg", ".jpeg":
		contentType = "image/jpeg"
	case ".svg":
		contentType = "image/svg+xml"
	default:
		contentType = "application/octet-stream"
	}

	file, err := os.Open(filePath)
	if err != nil {
		h.WriteError(w, http.StatusNotFound, "logo not found")
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "private, max-age=3600")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, file)
}

