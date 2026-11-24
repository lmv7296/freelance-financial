package service

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
)

var (
	ErrSenderNotRegistered = errors.New("sender phone number is not registered or not active")
)

// WhatsAppWebhookMessage represents incoming payload from WhatsApp Business / Meta / Twilio.
type WhatsAppWebhookMessage struct {
	From        string `json:"from"`        // sender phone, e.g. "+31612345678" or "31612345678"
	To          string `json:"to"`          // company receiving number
	MessageID   string `json:"message_id"`  // external message id
	Type        string `json:"type"`        // "image", "document", "text"
	MediaURL    string `json:"media_url"`   // URL or base64 data
	MediaBase64 string `json:"media_base64"`// optional raw base64 data
	Caption     string `json:"caption"`     // optional caption or notes
	MimeType    string `json:"mime_type"`   // e.g. "image/jpeg"
}

type WhatsAppService interface {
	ProcessIncomingWebhook(ctx context.Context, msg WhatsAppWebhookMessage) (*model.Expense, error)
	FindCompanyBySenderPhone(ctx context.Context, phone string) (companyID string, sender *model.WhatsAppSender, err error)
}

type whatsAppService struct {
	settingsRepo repository.SettingsRepository
	expenseSvc   ExpenseService
	extractor    ReceiptExtractor
	logger       *slog.Logger
}

func NewWhatsAppService(
	settingsRepo repository.SettingsRepository,
	expenseSvc ExpenseService,
	extractor ReceiptExtractor,
	logger *slog.Logger,
) WhatsAppService {
	return &whatsAppService{
		settingsRepo: settingsRepo,
		expenseSvc:   expenseSvc,
		extractor:    extractor,
		logger:       logger,
	}
}

func (s *whatsAppService) FindCompanyBySenderPhone(ctx context.Context, phone string) (string, *model.WhatsAppSender, error) {
	normPhone, err := NormalizePhoneE164(phone)
	if err != nil {
		normPhone = phone
	}

	companyID, sender, err := s.settingsRepo.FindSenderByPhone(ctx, normPhone)
	if err != nil {
		return "", nil, err
	}
	if sender == nil || !sender.Active {
		return "", nil, ErrSenderNotRegistered
	}
	return companyID, sender, nil
}

func (s *whatsAppService) ProcessIncomingWebhook(ctx context.Context, msg WhatsAppWebhookMessage) (*model.Expense, error) {
	companyID, sender, err := s.FindCompanyBySenderPhone(ctx, msg.From)
	if err != nil {
		s.logger.Warn("whatsapp message rejected: unregistered sender",
			slog.String("from", msg.From),
			slog.Any("err", err),
		)
		return nil, ErrSenderNotRegistered
	}

	// 1. Prepare receipt file
	receiptDataURL := msg.MediaBase64
	if receiptDataURL != "" && !strings.HasPrefix(receiptDataURL, "data:") {
		mime := msg.MimeType
		if mime == "" {
			mime = "image/jpeg"
		}
		receiptDataURL = fmt.Sprintf("data:%s;base64,%s", mime, receiptDataURL)
	}

	// 2. Initial expense with status 'processing'
	source := "whatsapp"
	statusProcessing := model.ExpenseStatusProcessing
	now := time.Now().UTC().Format("2006-01-02")

	notes := msg.Caption
	createReq := &model.CreateExpenseRequest{
		MerchantName:    "Bonnetje via WhatsApp",
		ReceiptDate:     &now,
		Currency:        "EUR",
		TotalAmount:     0.0,
		ReceiptURL:      receiptDataURL,
		Status:          &statusProcessing,
		Source:          &source,
		Notes:           &notes,
	}

	expense, err := s.expenseSvc.CreateExpense(ctx, companyID, createReq)
	if err != nil {
		return nil, fmt.Errorf("create initial expense: %w", err)
	}

	// Attach sender phone & name
	expense.SenderName = &sender.Name
	expense.SenderPhone = &sender.Phone

	// 3. Increment receipts count for sender
	_ = s.settingsRepo.UpdateSenderReceiptsCount(ctx, companyID, sender.ID, sender.ReceiptsCount+1)

	// 4. Run async OCR / AI extraction to advance status from processing -> needs_review
	go s.performExtractionAsync(companyID, expense, receiptDataURL, msg.MimeType)

	return expense, nil
}

func (s *whatsAppService) performExtractionAsync(companyID string, exp *model.Expense, receiptDataURL string, mimeType string) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	// Extract data if available
	var fileBytes []byte
	if strings.Contains(receiptDataURL, ",") {
		parts := strings.SplitN(receiptDataURL, ",", 2)
		decoded, _ := base64.StdEncoding.DecodeString(parts[1])
		fileBytes = decoded
	}

	extracted, err := s.extractor.ExtractReceipt(ctx, fileBytes, mimeType)
	if err != nil {
		s.logger.Error("ocr extraction failed", slog.String("expense_id", exp.ID), slog.Any("err", err))
		return
	}

	// Update expense to needs_review with extracted details
	statusNeedsReview := model.ExpenseStatusNeedsReview
	updateReq := &model.UpdateExpenseRequest{
		Status:          &statusNeedsReview,
		MerchantName:    &extracted.MerchantName,
		ReceiptDate:     extracted.ReceiptDate,
		Category:        extracted.Category,
		SubtotalAmount:  extracted.SubtotalAmount,
		VatAmount:       extracted.VatAmount,
		TotalAmount:     &extracted.TotalAmount,
	}

	if len(extracted.VatLines) > 0 {
		vatLines := make([]model.ExpenseVatLine, len(extracted.VatLines))
		for i, vl := range extracted.VatLines {
			vatLines[i] = model.ExpenseVatLine{
				Rate:       vl.Rate,
				BaseAmount: vl.BaseAmount,
				VatAmount:  vl.VatAmount,
			}
		}
		updateReq.VatLines = &vatLines
	}

	_, updateErr := s.expenseSvc.UpdateExpense(ctx, companyID, exp.ID, updateReq)
	if updateErr != nil {
		s.logger.Error("failed to update expense after extraction",
			slog.String("expense_id", exp.ID),
			slog.Any("err", updateErr),
		)
	} else {
		s.logger.Info("expense extracted successfully and moved to needs_review",
			slog.String("expense_id", exp.ID),
			slog.String("merchant", extracted.MerchantName),
		)
	}
}
