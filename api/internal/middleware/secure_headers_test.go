package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"go-freelancer/internal/middleware"
)

func TestSecureHeaders(t *testing.T) {
	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	secHandler := middleware.SecureHeaders(true)(dummyHandler)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()

	secHandler.ServeHTTP(rr, req)

	expectedHeaders := map[string]string{
		"X-Content-Type-Options":            "nosniff",
		"X-Frame-Options":                   "DENY",
		"X-XSS-Protection":                  "0",
		"Referrer-Policy":                   "strict-origin-when-cross-origin",
		"Content-Security-Policy":           "default-src 'none'; frame-ancestors 'none';",
		"Strict-Transport-Security":         "max-age=63072000; includeSubDomains; preload",
	}

	for header, expectedVal := range expectedHeaders {
		val := rr.Header().Get(header)
		if val != expectedVal {
			t.Errorf("header %s: expected %q, got %q", header, expectedVal, val)
		}
	}
}
