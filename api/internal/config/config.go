package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds the application configuration with secure defaults.
// IMPORTANT: Never store sensitive credentials (API keys, database passwords)
// or internal production ports in code. Always supply them via environment variables.
type Config struct {
	// Server Network
	Port string
	Host string
	Env  string

	// Timeouts for Slowloris and connection exhaustion prevention
	ReadHeaderTimeout time.Duration
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	ShutdownTimeout   time.Duration

	// Limits
	MaxHeaderBytes int

	// Security & CORS
	AllowedOrigins []string

	// Reverse proxies (IPs or CIDRs) whose X-Forwarded-For is trusted, e.g. the Next.js app
	TrustedProxies []string

	// Rate Limiting
	RateLimitRequestsPerSecond float64
	RateLimitBurst             int
	RateLimitEnabled           bool

	// Database Configuration (Postgres)
	DBHost      string
	DBPort      string
	DBUser      string
	DBPassword  string
	DBName      string
	DBSSLMode   string
	DatabaseURL string
}

// Load loads configuration from environment variables.
// In local development, it will automatically parse .env if present.
func Load() *Config {
	// Attempt to load .env for local development (ignored in production / if missing)
	loadDotEnv()

	return &Config{
		Port: getEnv("PORT", "8080"),
		Host: getEnv("HOST", "127.0.0.1"),
		Env:  getEnv("APP_ENV", "development"),

		// Strict timeouts to mitigate Slowloris / slow HTTP DoS attacks
		ReadHeaderTimeout: time.Duration(getEnvAsInt("SERVER_READ_HEADER_TIMEOUT_SEC", 5)) * time.Second,
		ReadTimeout:       time.Duration(getEnvAsInt("SERVER_READ_TIMEOUT_SEC", 10)) * time.Second,
		WriteTimeout:      time.Duration(getEnvAsInt("SERVER_WRITE_TIMEOUT_SEC", 30)) * time.Second,
		IdleTimeout:       time.Duration(getEnvAsInt("SERVER_IDLE_TIMEOUT_SEC", 120)) * time.Second,
		ShutdownTimeout:   time.Duration(getEnvAsInt("SERVER_SHUTDOWN_TIMEOUT_SEC", 10)) * time.Second,

		// 1MB max header size to prevent header memory exhaustion
		MaxHeaderBytes: 1 << 20,

		// CORS: Comma-separated list of origins
		AllowedOrigins: parseCommaSeparated(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")),

		// Off by default: Next.js passes the browser's X-Forwarded-For through unchanged,
		// so it can only be trusted when an edge proxy (Caddy/nginx) in front of Next.js
		// overwrites it. Then list the address Next.js connects from (e.g. 127.0.0.1,::1).
		TrustedProxies: parseCommaSeparated(getEnv("TRUSTED_PROXIES", "")),

		// Rate Limiting (Token Bucket per IP)
		RateLimitRequestsPerSecond: getEnvAsFloat("RATE_LIMIT_RPS", 20.0),
		RateLimitBurst:             getEnvAsInt("RATE_LIMIT_BURST", 50),
		RateLimitEnabled:           getEnvAsBool("RATE_LIMIT_ENABLED", true),

		// Database Configuration - strictly read from environment, no hardcoded fallbacks
		DBHost:      getEnv("DB_HOST", "127.0.0.1"),
		DBPort:      getEnv("DB_PORT", ""),
		DBUser:      getEnv("DB_USER", ""),
		DBPassword:  getEnv("DB_PASSWORD", ""),
		DBName:      getEnv("DB_NAME", ""),
		DBSSLMode:   getEnv("DB_SSLMODE", "disable"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
	}
}

// Address returns the combined host:port string.
func (c *Config) Address() string {
	return c.Host + ":" + c.Port
}

// IsProduction returns true if running in production mode.
func (c *Config) IsProduction() bool {
	return strings.ToLower(c.Env) == "production"
}

// DSN returns the database connection string. If credentials/ports are missing, returns empty string.
func (c *Config) DSN() string {
	if c.DatabaseURL != "" {
		return c.DatabaseURL
	}
	if c.DBUser == "" || c.DBPort == "" || c.DBName == "" {
		return ""
	}
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName, c.DBSSLMode)
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}

func getEnvAsInt(key string, defaultVal int) int {
	valStr := getEnv(key, "")
	if val, err := strconv.Atoi(valStr); err == nil {
		return val
	}
	return defaultVal
}

func getEnvAsFloat(key string, defaultVal float64) float64 {
	valStr := getEnv(key, "")
	if val, err := strconv.ParseFloat(valStr, 64); err == nil {
		return val
	}
	return defaultVal
}

func getEnvAsBool(key string, defaultVal bool) bool {
	valStr := getEnv(key, "")
	if val, err := strconv.ParseBool(valStr); err == nil {
		return val
	}
	return defaultVal
}

func parseCommaSeparated(val string) []string {
	if strings.TrimSpace(val) == "" {
		return nil
	}
	parts := strings.Split(val, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
