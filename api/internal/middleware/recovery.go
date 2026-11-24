package middleware

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"runtime/debug"
)

// Recoverer safely catches panics, logs the stack trace internally, and returns
// a generic, sanitized JSON error to prevent internal information leakage.
func Recoverer(logger *slog.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rvr := recover(); rvr != nil {
					if rvr == http.ErrAbortHandler {
						panic(rvr)
					}

					// Log full stack trace internally for developers
					logger.Error("panic recovered",
						slog.Any("error", rvr),
						slog.String("path", r.URL.Path),
						slog.String("method", r.Method),
						slog.String("remote_addr", r.RemoteAddr),
						slog.String("stack", string(debug.Stack())),
					)

					// Return generic error message to the client to avoid leaking implementation details
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusInternalServerError)
					_ = json.NewEncoder(w).Encode(map[string]string{
						"error": "an unexpected internal error occurred",
					})
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}
