package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"

	"go-freelancer/internal/service"
)

// verifyWebhookSignature validates incoming payload HMAC against WHATSAPP_WEBHOOK_SECRET.
func verifyWebhookSignature(r *http.Request, body []byte) bool {
	secret := os.Getenv("WHATSAPP_WEBHOOK_SECRET")
	if secret == "" {
		// If in development or not configured, allow fallback without blocking local testing
		return true
	}

	sigHeader := r.Header.Get("X-Hub-Signature-256")
	if sigHeader == "" {
		return false
	}
	expectedSig := strings.TrimPrefix(sigHeader, "sha256=")

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	actualSig := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(actualSig), []byte(expectedSig))
}

// WhatsAppWebhook handles POST and GET /api/v1/webhooks/whatsapp.
// Receives inbound messages and receipts from WhatsApp Business API / Twilio with HMAC verification.
func (h *Handler) WhatsAppWebhook(w http.ResponseWriter, r *http.Request) {
	// Support webhook challenge verification if present (Meta Cloud API verification)
	if r.Method == http.MethodGet {
		mode := r.URL.Query().Get("hub.mode")
		challenge := r.URL.Query().Get("hub.challenge")
		verifyToken := r.URL.Query().Get("hub.verify_token")

		expectedToken := os.Getenv("WHATSAPP_VERIFY_TOKEN")
		if mode == "subscribe" && challenge != "" {
			if expectedToken != "" && verifyToken != expectedToken {
				h.WriteError(w, http.StatusForbidden, "Invalid verify token")
				return
			}
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(challenge))
			return
		}
		h.WriteError(w, http.StatusBadRequest, "Missing subscription parameters")
		return
	}

	// Read body with 15MB limit
	bodyBytes, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 15<<20))
	if err != nil {
		h.WriteError(w, http.StatusBadRequest, "Payload exceeds limit")
		return
	}

	// HMAC Signature verification
	if !verifyWebhookSignature(r, bodyBytes) {
		h.logger.Warn("unauthorized whatsapp webhook request: signature mismatch", "remote_addr", r.RemoteAddr)
		h.WriteError(w, http.StatusUnauthorized, "Invalid webhook signature")
		return
	}

	var msg service.WhatsAppWebhookMessage
	if err := json.Unmarshal(bodyBytes, &msg); err != nil {
		h.WriteError(w, http.StatusBadRequest, "Invalid webhook payload")
		return
	}

	expense, err := h.whatsAppSvc.ProcessIncomingWebhook(r.Context(), msg)
	if err != nil {
		if err == service.ErrSenderNotRegistered {
			h.WriteError(w, http.StatusForbidden, "Sender not registered for this business")
			return
		}
		h.logger.Error("failed to process whatsapp webhook", "err", err)
		h.WriteError(w, http.StatusInternalServerError, "Failed to process receipt")
		return
	}

	_ = h.WriteJSON(w, http.StatusAccepted, map[string]interface{}{
		"status":     "processing",
		"expense_id": expense.ID,
	})
}
