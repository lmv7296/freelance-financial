package main

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/jackc/pgx/v5/stdlib"

	"go-freelancer/internal/config"
	"go-freelancer/internal/handler"
	"go-freelancer/internal/middleware"
	"go-freelancer/internal/repository"
	"go-freelancer/internal/service"
	"go-freelancer/internal/service/report"
	"go-freelancer/internal/service/tax"
)

func main() {
	// 1. Load configuration with security defaults
	cfg := config.Load()

	// 2. Initialize structured logger
	var logHandler slog.Handler
	if cfg.IsProduction() {
		logHandler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
	} else {
		logHandler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})
	}
	logger := slog.New(logHandler)
	slog.SetDefault(logger)

	logger.Info("starting application",
		slog.String("env", cfg.Env),
		slog.String("port", cfg.Port),
	)

	// 3. Initialize database connection & repositories
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = cfg.DatabaseURL
	}

	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		logger.Error("failed to open database connection", slog.Any("err", err))
		os.Exit(1)
	}
	defer db.Close()

	// Configure pool parameters
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * 60) // 5 minutes

	if err := db.Ping(); err != nil {
		logger.Error("database ping failed: unable to connect to postgresql", slog.Any("err", err), slog.String("url", dbURL))
		os.Exit(1)
	}
	logger.Info("connected to PostgreSQL database successfully")

	userRepo := repository.NewPostgresUserRepository(db)
	sessionRepo := repository.NewPostgresSessionRepository(db)
	generalRepo := repository.NewMemoryRepository()
	companyRepo := repository.NewPostgresCompanyRepository(db)
	settingsRepo := repository.NewPostgresSettingsRepository(db, "./uploads/logos")
	expenseRepo := repository.NewPostgresExpenseRepository(db, "./uploads/receipts")
	clientRepo := repository.NewPostgresClientInvoiceRepository(db)
	taxVaultRepo := repository.NewPostgresTaxVaultRepository(db)

	// Seed tax rules from tax-rules-2026-nl.json if available
	seedPaths := []string{
		"./tax-rules-2026-nl.json",
		"../freelanc-financial/freelance-financial/docs/tax-rules-2026-nl.json",
		"/Users/lorenzo/freelanc-financial/freelance-financial/docs/tax-rules-2026-nl.json",
	}
	for _, sp := range seedPaths {
		if rules, err := repository.LoadTaxRulesFromJSONFile(sp); err == nil && len(rules) > 0 {
			_ = taxVaultRepo.SeedTaxRules(context.Background(), rules)
			logger.Info("seeded tax rules successfully", slog.Int("count", len(rules)), slog.String("path", sp))
			break
		}
	}

	// 4. Initialize services
	emailSender := service.NewDefaultEmailSender(logger)
	authSvc := service.NewAuthService(userRepo, sessionRepo, companyRepo, settingsRepo, taxVaultRepo, emailSender)
	generalSvc := service.New(generalRepo)
	settingsSvc := service.NewSettingsService(settingsRepo, clientRepo)
	expenseSvc := service.NewExpenseService(expenseRepo, clientRepo)
	clientInvSvc := service.NewClientInvoiceService(clientRepo, settingsRepo)
	taxVaultSvc := tax.NewTaxVaultService(taxVaultRepo, expenseRepo, clientRepo)
	reportSvc := report.NewReportService(companyRepo, clientRepo, expenseRepo, taxVaultRepo)
	extractor := service.NewDefaultReceiptExtractor()
	whatsAppSvc := service.NewWhatsAppService(settingsRepo, expenseSvc, extractor, logger)

	// 5. Initialize handlers
	appHandler := handler.New(generalSvc, authSvc, settingsSvc, expenseSvc, taxVaultSvc, reportSvc, whatsAppSvc, clientInvSvc, logger, cfg.IsProduction())

	// 6. Set up router and register routes
	mux := http.NewServeMux()
	authLimiter := middleware.NewAuthRateLimiter()
	appHandler.RegisterRoutes(mux, authLimiter)

	// 7. Build global defensive middleware stack
	middlewares := []middleware.Middleware{
		middleware.SecureHeaders(cfg.IsProduction()),
		middleware.CORS(cfg.AllowedOrigins),
		middleware.Recoverer(logger),
		middleware.Logging(logger),
	}

	if cfg.RateLimitEnabled {
		limiter := middleware.NewRateLimiter(cfg.RateLimitRequestsPerSecond, cfg.RateLimitBurst)
		middlewares = append(middlewares, middleware.RateLimit(limiter))
	}

	wrappedHandler := middleware.Chain(mux, middlewares...)

	// 8. Configure HTTP server with defensive timeouts (prevents Slowloris / resource starvation)
	server := &http.Server{
		Addr:              cfg.Address(),
		Handler:           wrappedHandler,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		ReadTimeout:       cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
		MaxHeaderBytes:    cfg.MaxHeaderBytes,
	}

	// 9. Channel to listen for errors coming from the listener
	serverErrors := make(chan error, 1)

	go func() {
		logger.Info("server listening", slog.String("addr", cfg.Address()))
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErrors <- err
		}
	}()

	// 10. Graceful shutdown listening for OS signals (SIGINT, SIGTERM)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case err := <-serverErrors:
		logger.Error("server failed to start", slog.Any("error", err))
		os.Exit(1)
	case <-ctx.Done():
		logger.Info("shutdown signal received, commencing graceful shutdown...")

		shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			logger.Error("server forced to shutdown due to timeout", slog.Any("error", err))
			if closeErr := server.Close(); closeErr != nil {
				logger.Error("error closing server listener", slog.Any("error", closeErr))
			}
		}

		logger.Info("server exited gracefully")
	}
}
