# Go Freelancer Backend

A clean, production-ready Go web backend following the **Standard Layered Architecture** with zero external dependencies (pure Go standard library). Built with a **Security-First** philosophy, modern `net/http` routing (Go 1.22+), and idiomatic Go practices.

---

## 📁 Project Structure

```text
.
├── cmd/
│   └── api/
│       └── main.go              # Application entrypoint: wires dependencies, starts server, handles graceful shutdown
├── docs/
│   └── API_FRONTEND_GUIDE.md    # Complete frontend API reference with TypeScript types & client examples
├── internal/
│   ├── config/
│   │   ├── config.go            # Loads settings from environment with secure defaults
│   │   └── env.go               # Safe local .env parser (never overwrites system env, never committed)
│   ├── handler/
│   │   ├── handler.go           # Base HTTP handler, route registration, JSON encoding/decoding helpers
│   │   ├── health.go            # Health and readiness check endpoints (/healthz, /readyz, /api/v1/health)
│   │   └── health_test.go       # Health handler unit tests
│   ├── middleware/
│   │   ├── cors.go              # CORS middleware with strict origin whitelist validation
│   │   ├── logging.go           # Structured HTTP request logger using log/slog
│   │   ├── middleware.go        # Middleware chaining type & helper
│   │   ├── ratelimit.go         # Defensive in-memory token-bucket rate limiter per IP
│   │   ├── recovery.go          # Panic recovery shielding that hides internal stack traces from clients
│   │   ├── secure_headers.go    # OWASP-recommended security headers (CSP, HSTS, X-Frame-Options, etc.)
│   │   └── secure_headers_test.go
│   ├── model/
│   │   └── model.go             # Domain entity definitions
│   ├── repository/
│   │   └── repository.go        # Data access interface & storage implementations
│   └── service/
│       └── service.go           # Business logic layer interfaces & implementation
├── .env.example                 # Sanitized configuration template (safe to commit)
├── .gitignore                   # Comprehensive rules preventing credentials/secrets from git
├── Makefile                     # Developer workflows (run, build, test, audit, clean)
├── go.mod                       # Go module definition
└── README.md                    # Project documentation
```

> 📖 **Frontend Engineers:** See [**Frontend Integration Guide**](file:///Users/lorenzo/GO_Freelancer/docs/API_FRONTEND_GUIDE.md) for full TypeScript models, error response schemas, and copy-pasteable client code.

---

## 🔒 Security Architecture (Security First)

1. **Zero Secret Leakage & No Insecure Fallbacks**:
   - Secrets and ports are **never** hardcoded into files or fallback defaults.
   - `docker-compose.yml` strictly uses mandatory variable syntax (`${DB_PORT:?DB_PORT must be defined in .env}`) preventing accidental fallback to standard predictable ports (like 5432) or default passwords.
   - All Docker ports are bound exclusively to `127.0.0.1` (loopback only), ensuring no exposure to the local area network or public interfaces.
   - `.gitignore` strictly blocks `.env`, `.env.*`, `*.pem`, `*.key`, `*.cert`, `secrets/`, and sensitive files.
   - A sanitized `.env.example` is provided as a template with dummy placeholders.

2. **Defense-in-Depth HTTP Headers**:
   - `X-Content-Type-Options: nosniff` (mitigates MIME-type confusion attacks)
   - `X-Frame-Options: DENY` (prevents clickjacking)
   - `Content-Security-Policy: default-src 'none'; frame-ancestors 'none';` (strict API policy)
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()`
   - `Strict-Transport-Security` (automatically enabled in production mode)

3. **Slowloris & Connection Exhaustion Defense**:
   - `ReadHeaderTimeout: 5s` (mitigates slow HTTP header injection)
   - `ReadTimeout: 10s`
   - `WriteTimeout: 30s`
   - `IdleTimeout: 120s`
   - `MaxHeaderBytes: 1MB`
   - Request body limit capped at 1MB with `http.MaxBytesReader`

4. **Information Disclosure Shielding**:
   - Panic recovery safely intercepts panics, writes full debug stacks to internal `slog` output, and returns a sanitized generic error to clients.
   - Logs never dump query parameters or sensitive headers (`Authorization`, tokens).

5. **Built-in Rate Limiting**:
   - In-memory token-bucket rate limiter tracks requests per client IP to mitigate brute force and denial of service. Includes automatic background cleanup for idle clients.

---

## 🚀 Getting Started

### Prerequisites
- Go 1.22+ installed (`go version`)

### 1. Configure Environment
Copy the example configuration file:
```bash
cp .env.example .env
```
Edit `.env` to configure your local settings.

### 2. Run the Development Server
```bash
make run
# or: go run ./cmd/api
```

The server will start listening at `http://0.0.0.0:8080`.

### 3. Verify Endpoints
```bash
curl -i http://localhost:8080/healthz
```
Expected response:
```json
HTTP/1.1 200 OK
Content-Type: application/json
X-Content-Type-Options: nosniff
X-Frame-Options: DENY

{"status":"available","timestamp":"...","version":"1.0.0"}
```

---

## 🔐 Authentication Endpoints (`/api/v1/auth`)

All auth endpoints implement strict security best practices:
- **Rate-Limited**: Protected against credential stuffing (max 5 requests/min per IP).
- **Dual Token Transport**: Emits both an `HttpOnly`, `SameSite=Strict` cookie and a Bearer JSON token.
- **Timing Safe**: Constant-time execution prevents account enumeration.
- **Password Protection**: Salted & hashed using `bcrypt` (cost 10). Password hashes are excluded from JSON serialization.

### 1. Register User (`POST /api/v1/auth/register`)
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepassword123"}'
```
Response (`201 Created`):
```json
{
  "user": {
    "id": "e3a891b0d7f42c19",
    "email": "user@example.com",
    "created_at": "2026-10-27T23:40:00Z",
    "updated_at": "2026-10-27T23:40:00Z"
  }
}
```

### 2. Login (`POST /api/v1/auth/login`)
```bash
curl -i -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepassword123"}'
```
Response (`200 OK` with `Set-Cookie: session_token=...; HttpOnly; SameSite=Strict`):
```json
{
  "token": "4a71b1...",
  "expires_at": "2026-10-28T23:40:00Z",
  "user": {
    "id": "e3a891b0d7f42c19",
    "email": "user@example.com"
  }
}
```

### 3. Logout (`POST /api/v1/auth/logout`)
Works via `Authorization: Bearer <token>` header or the `session_token` cookie.
```bash
curl -i -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Authorization: Bearer 4a71b1..."
```
Response (`200 OK` + expired cookie `Max-Age=-1`):
```json
{
  "message": "successfully logged out"
}
```

---

## 🧪 Testing & Quality Checks

Run the automated test suite with race detector:
```bash
make test
```

Check code test coverage:
```bash
make test-cover
```

Run static code analysis:
```bash
make audit
```

Compile an optimized, stripped production binary:
```bash
make build
```
Binary will be written to `bin/api`.

---

## 🧱 Extending the Application

Follow the Clean Architecture flow when adding a new feature:

1. **Domain Model**: Define the struct in [`internal/model/`](file:///Users/lorenzo/GO_Freelancer/internal/model/model.go).
2. **Repository**: Declare data access methods in [`internal/repository/`](file:///Users/lorenzo/GO_Freelancer/internal/repository/repository.go) and implement against your database (PostgreSQL, SQLite, etc.).
3. **Service**: Implement business rules and logic in [`internal/service/`](file:///Users/lorenzo/GO_Freelancer/internal/service/service.go).
4. **Handler**: Add HTTP endpoint logic and route registration in [`internal/handler/`](file:///Users/lorenzo/GO_Freelancer/internal/handler/handler.go).
