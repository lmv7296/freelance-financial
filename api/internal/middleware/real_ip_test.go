package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRealIP(t *testing.T) {
	trusted := []string{"127.0.0.1", "::1", "10.0.0.0/8"}

	tests := []struct {
		name       string
		remoteAddr string
		xff        []string
		want       string
	}{
		{"trusted proxy uses forwarded IP", "127.0.0.1:5000", []string{"203.0.113.7"}, "203.0.113.7:0"},
		{"trusted CIDR proxy", "10.1.2.3:5000", []string{"203.0.113.7"}, "203.0.113.7:0"},
		{"spoofed entries on the left are ignored", "127.0.0.1:5000", []string{"1.1.1.1, 203.0.113.7"}, "203.0.113.7:0"},
		{"last header wins", "[::1]:5000", []string{"1.1.1.1", "203.0.113.7"}, "203.0.113.7:0"},
		{"untrusted peer keeps its own address", "198.51.100.9:5000", []string{"203.0.113.7"}, "198.51.100.9:5000"},
		{"no header keeps proxy address", "127.0.0.1:5000", nil, "127.0.0.1:5000"},
		{"garbage header keeps proxy address", "127.0.0.1:5000", []string{"not-an-ip"}, "127.0.0.1:5000"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got string
			h := RealIP(trusted)(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
				got = r.RemoteAddr
			}))
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.RemoteAddr = tt.remoteAddr
			for _, v := range tt.xff {
				req.Header.Add("X-Forwarded-For", v)
			}
			h.ServeHTTP(httptest.NewRecorder(), req)
			if got != tt.want {
				t.Errorf("RemoteAddr = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestRealIPDisabledWithoutTrustedProxies(t *testing.T) {
	var got string
	h := RealIP(nil)(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		got = r.RemoteAddr
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "127.0.0.1:5000"
	req.Header.Set("X-Forwarded-For", "203.0.113.7")
	h.ServeHTTP(httptest.NewRecorder(), req)
	if got != "127.0.0.1:5000" {
		t.Errorf("RemoteAddr = %q, want unchanged", got)
	}
}
