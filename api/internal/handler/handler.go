package handler

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"

	"go-freelancer/internal/middleware"
	"go-freelancer/internal/service"
	"go-freelancer/internal/service/report"
	"go-freelancer/internal/service/tax"
)

// Handler holds dependencies for all HTTP handlers.
type Handler struct {
	svc          service.Service
	authSvc      service.AuthService
	settingsSvc  service.SettingsService
	expenseSvc   service.ExpenseService
	taxVaultSvc  *tax.TaxVaultService
	reportSvc    report.ReportService
	whatsAppSvc  service.WhatsAppService
	clientInvSvc service.ClientInvoiceService
	logger       *slog.Logger
	isProduction bool
}

// New creates a new Handler instance with all required services.
func New(
	svc service.Service,
	authSvc service.AuthService,
	settingsSvc service.SettingsService,
	expenseSvc service.ExpenseService,
	taxVaultSvc *tax.TaxVaultService,
	reportSvc report.ReportService,
	whatsAppSvc service.WhatsAppService,
	clientInvSvc service.ClientInvoiceService,
	logger *slog.Logger,
	isProduction bool,
) *Handler {
	return &Handler{
		svc:          svc,
		authSvc:      authSvc,
		settingsSvc:  settingsSvc,
		expenseSvc:   expenseSvc,
		taxVaultSvc:  taxVaultSvc,
		reportSvc:    reportSvc,
		whatsAppSvc:  whatsAppSvc,
		clientInvSvc: clientInvSvc,
		logger:       logger,
		isProduction: isProduction,
	}
}

// RegisterRoutes registers all application routes with appropriate middleware.
func (h *Handler) RegisterRoutes(mux *http.ServeMux, authLimiter *middleware.RateLimiter) {
	// Health & readiness checks
	mux.HandleFunc("GET /healthz", h.HealthCheck)
	mux.HandleFunc("GET /readyz", h.ReadinessCheck)
	mux.HandleFunc("GET /api/v1/health", h.HealthCheck)

	// Authentication Endpoints
	// Protected by strict brute-force rate limiter (5 attempts/min per IP)
	authRateMiddleware := middleware.RateLimit(authLimiter)

	mux.Handle("POST /api/v1/auth/register", authRateMiddleware(http.HandlerFunc(h.Register)))
	mux.Handle("POST /api/v1/auth/login", authRateMiddleware(http.HandlerFunc(h.Login)))
	mux.HandleFunc("POST /api/v1/auth/logout", h.Logout)
	mux.HandleFunc("GET /api/v1/auth/me", h.RequireAuth(h.GetCurrentUser))

	// Phase 1: Reference data and lists
	mux.HandleFunc("GET /api/v1/config", h.RequireAuth(h.GetConfig))
	mux.HandleFunc("GET /api/v1/settings/lists", h.RequireAuth(h.GetLists))
	mux.HandleFunc("PUT /api/v1/settings/lists", h.RequireAuth(h.UpdateLists))

	// Phase 2: Expenses
	mux.HandleFunc("GET /api/v1/expenses", h.RequireAuth(h.ListExpenses))
	mux.HandleFunc("GET /api/v1/expenses/{id}", h.RequireAuth(h.GetExpense))
	mux.HandleFunc("POST /api/v1/expenses", h.RequireAuth(h.CreateExpense))
	mux.HandleFunc("PATCH /api/v1/expenses/{id}", h.RequireAuth(h.UpdateExpense))
	mux.HandleFunc("DELETE /api/v1/expenses/{id}", h.RequireAuth(h.DeleteExpense))

	// Phase 2: Receipt files
	mux.HandleFunc("GET /api/v1/receipts/{id}", h.RequireAuth(h.GetReceipt))

	// Phase 2: Client & Invoice linking
	mux.HandleFunc("GET /api/v1/clients", h.RequireAuth(h.ListClients))
	mux.HandleFunc("POST /api/v1/clients", h.RequireAuth(h.CreateClient))
	mux.HandleFunc("PATCH /api/v1/clients/{id}", h.RequireAuth(h.UpdateClient))
	mux.HandleFunc("GET /api/v1/invoices", h.RequireAuth(h.ListInvoices))
	mux.HandleFunc("POST /api/v1/invoices", h.RequireAuth(h.CreateInvoice))
	mux.HandleFunc("PATCH /api/v1/invoices/{id}", h.RequireAuth(h.UpdateInvoice))

	// Phase 3: Company settings & logo
	mux.HandleFunc("GET /api/v1/settings/company", h.RequireAuth(h.GetCompany))
	mux.HandleFunc("PATCH /api/v1/settings/company", h.RequireAuth(h.UpdateCompany))
	mux.HandleFunc("POST /api/v1/settings/company/logo", h.RequireAuth(h.UploadLogo))
	mux.HandleFunc("DELETE /api/v1/settings/company/logo", h.RequireAuth(h.DeleteLogo))
	mux.HandleFunc("GET /api/v1/settings/company/logo", h.RequireAuth(h.GetLogo))

	// Phase 3: Invoice defaults
	mux.HandleFunc("GET /api/v1/settings/invoice-defaults", h.RequireAuth(h.GetInvoiceDefaults))
	mux.HandleFunc("PATCH /api/v1/settings/invoice-defaults", h.RequireAuth(h.UpdateInvoiceDefaults))

	// Phase 3: WhatsApp senders
	mux.HandleFunc("GET /api/v1/settings/whatsapp", h.RequireAuth(h.GetWhatsApp))
	mux.HandleFunc("POST /api/v1/settings/whatsapp/senders", h.RequireAuth(h.AddWhatsAppSender))
	mux.HandleFunc("PATCH /api/v1/settings/whatsapp/senders/{id}", h.RequireAuth(h.UpdateWhatsAppSender))
	mux.HandleFunc("DELETE /api/v1/settings/whatsapp/senders/{id}", h.RequireAuth(h.DeleteWhatsAppSender))

	// Phase 3: User preferences
	mux.HandleFunc("GET /api/v1/me/preferences", h.RequireAuth(h.GetPreferences))
	mux.HandleFunc("PATCH /api/v1/me/preferences", h.RequireAuth(h.UpdatePreferences))

	// Phase 3: Account & security
	mux.HandleFunc("PATCH /api/v1/me/email", h.RequireAuth(h.ChangeEmail))
	mux.HandleFunc("POST /api/v1/auth/change-password", h.RequireAuth(h.ChangePassword))
	mux.HandleFunc("POST /api/v1/auth/logout-all", h.RequireAuth(h.LogoutAll))

	// Onboarding & Email Verification
	mux.HandleFunc("PATCH /api/v1/me/profile", h.RequireAuth(h.UpdateProfile))
	mux.HandleFunc("POST /api/v1/auth/verify-email", h.VerifyEmail)
	mux.HandleFunc("POST /api/v1/auth/resend-verification", h.RequireAuth(h.ResendVerification))

	// Phase 4: Tax Vault
	mux.HandleFunc("GET /api/v1/tax-vault", h.RequireAuth(h.GetTaxVaultOverview))
	mux.HandleFunc("GET /api/v1/tax-profile", h.RequireAuth(h.GetTaxProfile))
	mux.HandleFunc("PUT /api/v1/tax-profile", h.RequireAuth(h.UpdateTaxProfile))
	mux.HandleFunc("GET /api/v1/tax-vault/export-options", h.RequireAuth(h.GetExportOptions))
	mux.HandleFunc("GET /api/v1/tax-vault/exports", h.RequireAuth(h.GetTaxExports))
	mux.HandleFunc("POST /api/v1/tax-vault/exports", h.RequireAuth(h.CreateTaxExport))

	// Reports
	mux.HandleFunc("GET /api/v1/reports/options", h.RequireAuth(h.GetReportOptions))
	mux.HandleFunc("GET /api/v1/reports/{key}", h.RequireAuth(h.DownloadReport))

	// Phase 5: WhatsApp Webhook
	mux.HandleFunc("POST /api/v1/webhooks/whatsapp", h.WhatsAppWebhook)
	mux.HandleFunc("GET /api/v1/webhooks/whatsapp", h.WhatsAppWebhook)
}

// WriteJSON sends a JSON response with status code and headers.
func (h *Handler) WriteJSON(w http.ResponseWriter, status int, data any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(data)
}

// WriteError sends a structured JSON error response.
func (h *Handler) WriteError(w http.ResponseWriter, status int, message string) {
	type errorResponse struct {
		Error string `json:"error"`
	}

	if err := h.WriteJSON(w, status, errorResponse{Error: message}); err != nil {
		h.logger.Error("failed to write error response", slog.Any("err", err))
	}
}

// ReadJSON decodes request JSON body into destination struct with a 1MB limit.
func (h *Handler) ReadJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	maxBytes := int64(1 << 20) // 1MB
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		return err
	}

	// Ensure there is only a single JSON value in the body
	err := dec.Decode(&struct{}{})
	if !errors.Is(err, io.EOF) {
		return errors.New("request body must only contain a single JSON value")
	}

	return nil
}
