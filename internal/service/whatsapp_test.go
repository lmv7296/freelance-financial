package service_test

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
	"go-freelancer/internal/service"
)

func TestWhatsAppWebhookFlow(t *testing.T) {
	ctx := context.Background()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	settingsRepo := repository.NewMemorySettingsRepository()
	expenseRepo := repository.NewMemoryExpenseRepository(t.TempDir())
	clientRepo := repository.NewMemoryClientInvoiceRepository()

	expenseSvc := service.NewExpenseService(expenseRepo, clientRepo)
	extractor := service.NewDefaultReceiptExtractor()
	waSvc := service.NewWhatsAppService(settingsRepo, expenseSvc, extractor, logger)

	companyID := "comp-wa-123"

	// 1. Unregistered sender should be rejected
	msgUnreg := service.WhatsAppWebhookMessage{
		From:     "+31611112222",
		Type:     "image",
		Caption:  "Gamma bon",
		MimeType: "image/jpeg",
	}
	_, err := waSvc.ProcessIncomingWebhook(ctx, msgUnreg)
	if err != service.ErrSenderNotRegistered {
		t.Fatalf("expected ErrSenderNotRegistered, got %v", err)
	}

	// 2. Register sender
	sender := model.WhatsAppSender{
		ID:     "snd-1",
		Name:   "Piet Timmerman",
		Phone:  "+31612345678",
		Active: true,
	}
	if err := settingsRepo.CreateWhatsAppSender(ctx, companyID, &sender); err != nil {
		t.Fatalf("create sender: %v", err)
	}

	// 3. Process webhook with registered sender
	msgReg := service.WhatsAppWebhookMessage{
		From:        "06 1234 5678", // test formatting normalization
		Type:        "image",
		Caption:     "Bouwmaat schroeven",
		MediaBase64: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
		MimeType:    "image/jpeg",
	}

	exp, err := waSvc.ProcessIncomingWebhook(ctx, msgReg)
	if err != nil {
		t.Fatalf("process registered webhook: %v", err)
	}

	if exp.Status != model.ExpenseStatusProcessing {
		t.Fatalf("expected initial status processing, got %s", exp.Status)
	}
	if exp.Source != "whatsapp" {
		t.Fatalf("expected source whatsapp, got %s", exp.Source)
	}
}

