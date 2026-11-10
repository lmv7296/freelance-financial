package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"go-freelancer/internal/model"
	"go-freelancer/internal/service"
)

type changeEmailRequest struct {
	NewEmail        string `json:"new_email"`
	CurrentPassword string `json:"current_password"`
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// ChangeEmail handles PATCH /api/v1/me/email.
func (h *Handler) ChangeEmail(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req changeEmailRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	if req.NewEmail == "" || req.CurrentPassword == "" {
		h.WriteError(w, http.StatusBadRequest, "new_email and current_password are required")
		return
	}

	updatedUser, err := h.authSvc.ChangeEmail(r.Context(), user.ID, req.CurrentPassword, req.NewEmail)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidCredentials):
			h.WriteError(w, http.StatusUnauthorized, "incorrect current password")
		case errors.Is(err, service.ErrEmailExists):
			h.WriteError(w, http.StatusConflict, "an account with this email address already exists")
		case errors.Is(err, service.ErrEmailInvalid):
			h.WriteError(w, http.StatusBadRequest, "a valid email address is required")
		default:
			h.logger.Error("failed to change email", "err", err, "user_id", user.ID)
			h.WriteError(w, http.StatusInternalServerError, "failed to update email")
		}
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, map[string]any{
		"user": map[string]any{
			"id":         updatedUser.ID,
			"company_id": updatedUser.CompanyID,
			"email":      updatedUser.Email,
			"created_at": updatedUser.CreatedAt,
			"updated_at": updatedUser.UpdatedAt,
		},
	})
}

// ChangePassword handles POST /api/v1/auth/change-password.
func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req changePasswordRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		h.WriteError(w, http.StatusBadRequest, "current_password and new_password are required")
		return
	}

	currentPlainToken := h.extractToken(r)

	if err := h.authSvc.ChangePassword(r.Context(), user.ID, req.CurrentPassword, req.NewPassword, currentPlainToken); err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidCredentials):
			h.WriteError(w, http.StatusUnauthorized, "incorrect current password")
		case errors.Is(err, service.ErrPasswordTooWeak):
			h.WriteError(w, http.StatusBadRequest, "password must be between 8 and 72 characters long")
		default:
			h.logger.Error("failed to change password", "err", err, "user_id", user.ID)
			h.WriteError(w, http.StatusInternalServerError, "failed to change password")
		}
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, messageResponse{Message: "password updated successfully"})
}

// LogoutAll handles POST /api/v1/auth/logout-all.
func (h *Handler) LogoutAll(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	if err := h.authSvc.LogoutAll(r.Context(), user.ID); err != nil {
		h.logger.Error("failed to logout all sessions", "err", err, "user_id", user.ID)
	}

	// Invalidate cookie in browser
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   h.isProduction,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})

	_ = h.WriteJSON(w, http.StatusOK, messageResponse{Message: "all sessions revoked successfully"})
}

