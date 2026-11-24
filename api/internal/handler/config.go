package handler

import (
	"net/http"

	"go-freelancer/internal/model"
)

// GetConfig handles GET /api/v1/config.
func (h *Handler) GetConfig(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	cfg, err := h.settingsSvc.GetConfig(r.Context(), user.CompanyID)
	if err != nil {
		h.logger.Error("failed to get config", "err", err, "company_id", user.CompanyID)
		h.WriteError(w, http.StatusInternalServerError, "failed to load reference config")
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, cfg)
}

