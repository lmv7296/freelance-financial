package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
	"go-freelancer/internal/service"
)

type whatsappSenderResponse struct {
	Sender *model.WhatsAppSender `json:"sender"`
}

type addSenderRequest struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
}

type updateSenderRequest struct {
	Name   *string `json:"name,omitempty"`
	Active *bool   `json:"active,omitempty"`
}

// GetWhatsApp handles GET /api/v1/settings/whatsapp.
func (h *Handler) GetWhatsApp(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	settings, err := h.settingsSvc.GetWhatsAppSettings(r.Context(), user.CompanyID)
	if err != nil {
		h.logger.Error("failed to get whatsapp settings", "err", err, "company_id", user.CompanyID)
		h.WriteError(w, http.StatusInternalServerError, "failed to get whatsapp settings")
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, settings)
}

// AddWhatsAppSender handles POST /api/v1/settings/whatsapp/senders.
func (h *Handler) AddWhatsAppSender(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req addSenderRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	sender, err := h.settingsSvc.AddWhatsAppSender(r.Context(), user.CompanyID, req.Name, req.Phone)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrDuplicatePhone):
			h.WriteError(w, http.StatusConflict, "this phone number is already registered")
		case errors.Is(err, service.ErrInvalidPhone):
			h.WriteError(w, http.StatusUnprocessableEntity, err.Error())
		default:
			h.logger.Error("failed to add whatsapp sender", "err", err, "company_id", user.CompanyID)
			h.WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	_ = h.WriteJSON(w, http.StatusCreated, whatsappSenderResponse{Sender: sender})
}

// UpdateWhatsAppSender handles PATCH /api/v1/settings/whatsapp/senders/{id}.
func (h *Handler) UpdateWhatsAppSender(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		h.WriteError(w, http.StatusBadRequest, "sender id is required")
		return
	}

	var req updateSenderRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	updated, err := h.settingsSvc.UpdateWhatsAppSender(r.Context(), user.CompanyID, id, req.Name, req.Active)
	if err != nil {
		if errors.Is(err, repository.ErrSenderNotFound) {
			h.WriteError(w, http.StatusNotFound, "whatsapp sender not found")
			return
		}
		h.logger.Error("failed to update whatsapp sender", "err", err, "id", id)
		h.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, whatsappSenderResponse{Sender: updated})
}

// DeleteWhatsAppSender handles DELETE /api/v1/settings/whatsapp/senders/{id}.
func (h *Handler) DeleteWhatsAppSender(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		h.WriteError(w, http.StatusBadRequest, "sender id is required")
		return
	}

	if err := h.settingsSvc.DeleteWhatsAppSender(r.Context(), user.CompanyID, id); err != nil {
		if errors.Is(err, repository.ErrSenderNotFound) {
			h.WriteError(w, http.StatusNotFound, "whatsapp sender not found")
			return
		}
		h.logger.Error("failed to delete whatsapp sender", "err", err, "id", id)
		h.WriteError(w, http.StatusInternalServerError, "failed to delete whatsapp sender")
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, messageResponse{Message: "sender removed"})
}

