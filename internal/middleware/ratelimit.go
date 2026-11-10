package middleware

import (
	"encoding/json"
	"net"
	"net/http"
	"sync"
	"time"
)

type client struct {
	tokens     float64
	lastRefill time.Time
}

// RateLimiter implements a defensive in-memory token-bucket rate limiter per IP.
type RateLimiter struct {
	mu           sync.Mutex
	clients      map[string]*client
	rps          float64
	burst        int
	errorMessage string
}

// NewRateLimiter creates a RateLimiter and runs a periodic background cleaner for inactive clients.
func NewRateLimiter(rps float64, burst int) *RateLimiter {
	return NewRateLimiterWithMessage(rps, burst, "rate limit exceeded, please retry shortly")
}

// NewRateLimiterWithMessage creates a RateLimiter with a custom rejection message.
func NewRateLimiterWithMessage(rps float64, burst int, errorMessage string) *RateLimiter {
	limiter := &RateLimiter{
		clients:      make(map[string]*client),
		rps:          rps,
		burst:        burst,
		errorMessage: errorMessage,
	}

	// Periodically clean up clients idle for more than 5 minutes to prevent memory leaks
	go limiter.cleanupRoutine(5 * time.Minute)

	return limiter
}

// NewAuthRateLimiter creates a strict rate limiter for sensitive authentication endpoints
// configured to allow at most 5 attempts per minute per IP to thwart brute force attacks.
func NewAuthRateLimiter() *RateLimiter {
	return NewRateLimiterWithMessage(5.0/60.0, 5, "too many authentication attempts, please wait a minute before retrying")
}

func (rl *RateLimiter) cleanupRoutine(interval time.Duration) {
	ticker := time.NewTicker(interval)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for ip, c := range rl.clients {
			if now.Sub(c.lastRefill) > interval {
				delete(rl.clients, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *RateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	c, exists := rl.clients[ip]
	if !exists {
		rl.clients[ip] = &client{
			tokens:     float64(rl.burst) - 1,
			lastRefill: now,
		}
		return true
	}

	// Refill tokens based on elapsed time
	elapsed := now.Sub(c.lastRefill).Seconds()
	c.tokens += elapsed * rl.rps
	if c.tokens > float64(rl.burst) {
		c.tokens = float64(rl.burst)
	}
	c.lastRefill = now

	if c.tokens >= 1 {
		c.tokens--
		return true
	}

	return false
}

// RateLimit returns a middleware that limits requests by client IP address.
func RateLimit(limiter *RateLimiter) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				ip = r.RemoteAddr
			}

			if !limiter.allow(ip) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", "60")
				w.WriteHeader(http.StatusTooManyRequests)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error": limiter.errorMessage,
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
