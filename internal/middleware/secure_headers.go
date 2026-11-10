package middleware

import "net/http"

// SecureHeaders sets modern, defensive HTTP response headers to protect against
// common web vulnerabilities (XSS, clickjacking, MIME sniffing, referrer leakage).
func SecureHeaders(isProduction bool) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Prevent MIME-sniffing
			w.Header().Set("X-Content-Type-Options", "nosniff")

			// Clickjacking protection
			w.Header().Set("X-Frame-Options", "DENY")

			// Modern browsers: disable legacy buggy XSS filters
			w.Header().Set("X-XSS-Protection", "0")

			// Control referrer information leakage
			w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

			// Restrict sensitive browser features
			w.Header().Set("Permissions-Policy", "geolocation=(), camera=(), microphone=(), payment=()")

			// Content Security Policy for API servers (no executable content, no framing)
			w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none';")

			// In production, enforce HTTPS via HSTS
			if isProduction {
				w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
			}

			next.ServeHTTP(w, r)
		})
	}
}
