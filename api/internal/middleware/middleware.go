package middleware

import "net/http"

// Middleware represents a standard HTTP middleware function.
type Middleware func(http.Handler) http.Handler

// Chain wraps a base handler with multiple middlewares in FIFO execution order.
func Chain(base http.Handler, middlewares ...Middleware) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		base = middlewares[i](base)
	}
	return base
}
