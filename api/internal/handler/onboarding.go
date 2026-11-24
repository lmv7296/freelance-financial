package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
	"go-freelancer/internal/service"
)

type verifyEmailRequest struct {
	Token string `json:"token"`
}

// UpdateProfile handles PATCH /api/v1/me/profile.
func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req model.UpdateProfileRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updatedUser, err := h.authSvc.UpdateProfile(r.Context(), user.ID, &req)
	if err != nil {
		if errors.Is(err, service.ErrForbiddenCompanyUpdate) {
			h.WriteError(w, http.StatusForbidden, "Only company owners can update company profile details")
			return
		}
		h.WriteError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, map[string]any{
		"user": updatedUser,
	})
}

// VerifyEmail handles POST /api/v1/auth/verify-email (Public endpoint).
func (h *Handler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req verifyEmailRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.authSvc.VerifyEmail(r.Context(), req.Token)
	if err != nil {
		if errors.Is(err, repository.ErrVerificationTokenInvalid) {
			h.WriteError(w, http.StatusBadRequest, "Ongeldige of verlopen verificatielink")
			return
		}
		h.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, map[string]any{
		"user": user,
	})
}

// ResendVerification handles POST /api/v1/auth/resend-verification.
func (h *Handler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	err := h.authSvc.ResendVerification(r.Context(), user.ID)
	if err != nil {
		if errors.Is(err, service.ErrRateLimited) {
			h.WriteError(w, http.StatusTooManyRequests, "Wacht een minuut voordat je een nieuwe verificatie-e-mail aanvraagt")
			return
		}
		h.logger.Error("failed to resend verification email", "err", err, "user_id", user.ID)
		h.WriteError(w, http.StatusInternalServerError, "Kon verificatie-e-mail niet versturen")
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, map[string]string{
		"message": "Verificatie-e-mail verzonden",
	})
}

