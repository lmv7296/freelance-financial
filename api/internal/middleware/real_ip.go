package middleware

import (
	"net"
	"net/http"
	"strings"
)

// RealIP restores the visitor's IP when the request came through a trusted
// reverse proxy (the Next.js /api rewrite). Without it every request would
// carry the proxy's address, so the per-IP rate limiters would throttle all
// users together.
//
// Only peers listed in trusted (IPs or CIDRs) are believed. Next.js passes the
// browser's X-Forwarded-For through unchanged, so this is only safe when an
// edge proxy (Caddy/nginx) in front of Next.js sets the header. The rightmost
// entry is used because that is the one the closest proxy wrote; anything left
// of it may come from the client.
func RealIP(trusted []string) Middleware {
	nets := parseTrusted(trusted)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if len(nets) > 0 {
				if ip := forwardedIP(r, nets); ip != "" {
					r.RemoteAddr = net.JoinHostPort(ip, "0")
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

func forwardedIP(r *http.Request, nets []*net.IPNet) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	peer := net.ParseIP(host)
	if peer == nil || !inAny(peer, nets) {
		return ""
	}

	xff := r.Header.Values("X-Forwarded-For")
	if len(xff) == 0 {
		return ""
	}
	parts := strings.Split(xff[len(xff)-1], ",")
	candidate := net.ParseIP(strings.TrimSpace(parts[len(parts)-1]))
	if candidate == nil {
		return ""
	}
	return candidate.String()
}

func parseTrusted(entries []string) []*net.IPNet {
	var nets []*net.IPNet
	for _, e := range entries {
		e = strings.TrimSpace(e)
		if e == "" {
			continue
		}
		if !strings.Contains(e, "/") {
			if ip := net.ParseIP(e); ip != nil {
				bits := 128
				if ip.To4() != nil {
					bits = 32
				}
				nets = append(nets, &net.IPNet{IP: ip, Mask: net.CIDRMask(bits, bits)})
			}
			continue
		}
		if _, n, err := net.ParseCIDR(e); err == nil {
			nets = append(nets, n)
		}
	}
	return nets
}

func inAny(ip net.IP, nets []*net.IPNet) bool {
	for _, n := range nets {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}
