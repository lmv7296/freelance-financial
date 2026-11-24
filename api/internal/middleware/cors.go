package middleware

import (
	"net/http"
	"strings"
)

// CORS validates the origin against an allowlist and sets appropriate CORS headers.
func CORS(allowedOrigins []string) Middleware {
	// Build map for O(1) origin lookup
	originMap := make(map[string]bool, len(allowedOrigins))
	allowAll := false
	for _, origin := range allowedOrigins {
		if origin == "*" {
			allowAll = true
		}
		originMap[strings.ToLower(strings.TrimSpace(origin))] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Check if request origin matches allowed origins
			if origin != "" {
				isAllowed := allowAll || originMap[strings.ToLower(origin)]

				if isAllowed {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Access-Control-Allow-Credentials", "true")
					w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
					w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token, X-Request-ID")
					w.Header().Set("Access-Control-Expose-Headers", "Content-Disposition")
					w.Header().Set("Access-Control-Max-Age", "600") // 10 minutes cache
					w.Header().Set("Vary", "Origin")
				}
			}

			// Preflight OPTIONS requests
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
