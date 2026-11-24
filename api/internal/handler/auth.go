package handler

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"go-freelancer/internal/model"
	"go-freelancer/internal/service"
)

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type registerResponse struct {
	User *model.User `json:"user"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token     string      `json:"token"`
	ExpiresAt time.Time   `json:"expires_at"`
	User      *model.User `json:"user"`
}

type messageResponse struct {
	Message string `json:"message"`
}

// Register creates a new user account.
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := h.ReadJSON(w, r, &req); err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	user, err := h.authSvc.Register(r.Context(), req.Email, req.Password)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrEmailInvalid):
			h.WriteError(w, http.StatusBadRequest, "a valid email address is required")
		case errors.Is(err, service.ErrPasswordTooWeak):
			h.WriteError(w, http.StatusBadRequest, "password must be at least 8 characters long")
		case errors.Is(err, service.ErrEmailExists):
			h.WriteError(w, http.StatusConflict, "an account with this email address already exists")
		default:
			h.logger.Error("registration failure", "err", err)
			h.WriteError(w, http.StatusInternalServerError, "failed to create account")
		}
		return
	}

	_ = h.WriteJSON(w, http.StatusCreated, registerResponse{User: user})
}

// Login authenticates a user, issuing a secure HttpOnly cookie and returning a Bearer token.
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := h.ReadJSON(w, r, &req); err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid request payload: "+err.Error())
		return
	}

	user, token, expiresAt, err := h.authSvc.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			h.WriteError(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		h.logger.Error("login failure", "err", err)
		h.WriteError(w, http.StatusInternalServerError, "authentication failed")
		return
	}

	// Set secure, HttpOnly, SameSite cookie (prevents XSS token exfiltration in browsers)
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   h.isProduction, // Enforce HTTPS transmission in production
		SameSite: http.SameSiteStrictMode,
		Expires:  expiresAt,
		MaxAge:   int(time.Until(expiresAt).Seconds()),
	})

	// Also return token in body for mobile / API clients using Authorization header
	_ = h.WriteJSON(w, http.StatusOK, loginResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		User:      user,
	})
}

// Logout revokes the session and clears authentication cookies.
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	token := h.extractToken(r)

	if token != "" {
		if err := h.authSvc.Logout(r.Context(), token); err != nil {
			h.logger.Error("logout failure", "err", err)
		}
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

	_ = h.WriteJSON(w, http.StatusOK, messageResponse{
		Message: "successfully logged out",
	})
}

// RequireAuth middleware ensures the request has an authenticated session.
func (h *Handler) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := h.extractToken(r)
		if token == "" {
			h.WriteError(w, http.StatusUnauthorized, "Authentication required")
			return
		}

		user, err := h.authSvc.ValidateSession(r.Context(), token)
		if err != nil {
			h.WriteError(w, http.StatusUnauthorized, "Invalid or expired session")
			return
		}

		ctx := model.WithUser(r.Context(), user)
		next(w, r.WithContext(ctx))
	}
}

// GetCurrentUser returns full profile information for the authenticated user.
func (h *Handler) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, map[string]any{
		"user": user,
	})
}

// extractToken extracts authentication token from Bearer header or session cookie.
func (h *Handler) extractToken(r *http.Request) string {
	// 1. Check Authorization: Bearer <token>
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			return strings.TrimSpace(parts[1])
		}
	}

	// 2. Check session_token cookie
	if cookie, err := r.Cookie("session_token"); err == nil && cookie.Value != "" {
		return cookie.Value
	}

	return ""
}
