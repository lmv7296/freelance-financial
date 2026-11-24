package handler

import (
	"encoding/json"
	"net/http"

	"go-freelancer/internal/model"
)

type preferencesResponse struct {
	Preferences *model.UserPreferences `json:"preferences"`
}

// GetPreferences handles GET /api/v1/me/preferences.
func (h *Handler) GetPreferences(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	prefs, err := h.settingsSvc.GetUserPreferences(r.Context(), user.ID)
	if err != nil {
		h.logger.Error("failed to get user preferences", "err", err, "user_id", user.ID)
		h.WriteError(w, http.StatusInternalServerError, "failed to get preferences")
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, preferencesResponse{Preferences: prefs})
}

// UpdatePreferences handles PATCH /api/v1/me/preferences.
func (h *Handler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req model.UserPreferences
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	updated, err := h.settingsSvc.UpdateUserPreferences(r.Context(), user.ID, &req)
	if err != nil {
		h.logger.Error("failed to update user preferences", "err", err, "user_id", user.ID)
		h.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, preferencesResponse{Preferences: updated})
}

