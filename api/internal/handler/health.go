package handler

import (
	"net/http"
	"time"
)

type healthResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Version   string    `json:"version"`
}

// HealthCheck responds with liveness state.
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	resp := healthResponse{
		Status:    "available",
		Timestamp: time.Now().UTC(),
		Version:   "1.0.0",
	}

	_ = h.WriteJSON(w, http.StatusOK, resp)
}

// ReadinessCheck verifies that the application and its dependencies (e.g. database) are ready.
func (h *Handler) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	// If you attach a database or external cache, verify connectivity here.
	resp := map[string]string{
		"status": "ready",
	}

	_ = h.WriteJSON(w, http.StatusOK, resp)
}
