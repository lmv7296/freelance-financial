package service

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"math"
	"path/filepath"
	"strings"
	"time"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
)

var (
	ErrInvalidStatus         = errors.New("invalid expense status; must be processing, needs_review, approved, or rejected")
	ErrInvalidMerchantName   = errors.New("merchant name is required")
	ErrUnsupportedReceiptType = errors.New("unsupported receipt file format; allowed: JPEG, PNG, WebP, HEIC, PDF")
	ErrReceiptTooLarge       = errors.New("receipt file exceeds maximum allowed size of 10MB")
)

const maxReceiptFileSize = 10 * 1024 * 1024 // 10MB

// ExpenseService defines business logic for managing expenses, receipts, clients, and invoices.
type ExpenseService interface {
	CreateExpense(ctx context.Context, companyID string, req *model.CreateExpenseRequest) (*model.Expense, error)
	GetExpense(ctx context.Context, companyID, id string) (*model.Expense, error)
	ListExpenses(ctx context.Context, companyID string, status *string, search *string) ([]*model.Expense, error)
	UpdateExpense(ctx context.Context, companyID, id string, req *model.UpdateExpenseRequest) (*model.Expense, error)
	DeleteExpense(ctx context.Context, companyID, id string) error
	GetReceiptFile(ctx context.Context, companyID, fileID string) (filePath string, contentType string, err error)

	ListClients(ctx context.Context, companyID string) ([]*model.Client, error)
	ListInvoices(ctx context.Context, companyID string, clientID *string) ([]*model.Invoice, error)
}

type expenseService struct {
	expenseRepo  repository.ExpenseRepository
	clientRepo   repository.ClientInvoiceRepository
}

// NewExpenseService creates a new ExpenseService instance.
func NewExpenseService(
	expenseRepo repository.ExpenseRepository,
	clientRepo repository.ClientInvoiceRepository,
) ExpenseService {
	return &expenseService{
		expenseRepo: expenseRepo,
		clientRepo:  clientRepo,
	}
}

func (s *expenseService) CreateExpense(ctx context.Context, companyID string, req *model.CreateExpenseRequest) (*model.Expense, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}

	cleanMerchant := strings.TrimSpace(req.MerchantName)
	if cleanMerchant == "" {
		return nil, ErrInvalidMerchantName
	}

	// Status validation
	status := model.ExpenseStatusApproved
	if req.Status != nil && *req.Status != "" {
		if !isValidStatus(*req.Status) {
			return nil, ErrInvalidStatus
		}
		status = *req.Status
	}

	source := "manual"
	if req.Source != nil && strings.TrimSpace(*req.Source) != "" {
		source = strings.TrimSpace(*req.Source)
	}

	currency := "EUR"
	if strings.TrimSpace(req.Currency) != "" {
		currency = strings.ToUpper(strings.TrimSpace(req.Currency))
	}

	// Calculate and normalize monetary amounts via cents to ensure precision
	totalCents := EurosToCents(req.TotalAmount)
	totalEuros := CentsToEuros(totalCents)

	var subtotalEuros *float64
	var vatEuros *float64

	if req.SubtotalAmount != nil {
		st := CentsToEuros(EurosToCents(*req.SubtotalAmount))
		subtotalEuros = &st
	}
	if req.VatAmount != nil {
		vt := CentsToEuros(EurosToCents(*req.VatAmount))
		vatEuros = &vt
	}
	if subtotalEuros == nil && vatEuros != nil {
		st := CentsToEuros(totalCents - EurosToCents(*vatEuros))
		subtotalEuros = &st
	} else if subtotalEuros != nil && vatEuros == nil {
		vt := CentsToEuros(totalCents - EurosToCents(*subtotalEuros))
		vatEuros = &vt
	}

	// Derive client and invoice names securely from repository
	var clientName *string
	var invoiceNumber *string

	if req.ClientID != nil && strings.TrimSpace(*req.ClientID) != "" {
		client, err := s.clientRepo.GetClientByID(ctx, companyID, *req.ClientID)
		if err == nil && client != nil {
			clientName = &client.Name
		}
	}

	if req.InvoiceID != nil && strings.TrimSpace(*req.InvoiceID) != "" {
		inv, err := s.clientRepo.GetInvoiceByID(ctx, companyID, *req.InvoiceID)
		if err == nil && inv != nil {
			invoiceNumber = &inv.InvoiceNumber
		}
	}

	expenseID := "exp_" + generateSecureID(16)

	// Process receipt base64 data URL if present
	receiptURL := req.ReceiptURL
	receiptContentType := req.ReceiptContentType
	var receiptFilePath string

	if strings.HasPrefix(receiptURL, "data:") {
		fileID := "rec_" + generateSecureID(16)
		savedPath, savedURL, contentType, err := s.processBase64Receipt(companyID, fileID, receiptURL)
		if err != nil {
			return nil, err
		}
		receiptURL = savedURL
		receiptContentType = &contentType
		receiptFilePath = savedPath
	}

	now := time.Now().UTC()
	expense := &model.Expense{
		ID:                   expenseID,
		Status:               status,
		Source:               source,
		MerchantName:         cleanMerchant,
		MerchantAddress:      req.MerchantAddress,
		ReceiptDate:          req.ReceiptDate,
		PaymentMethod:        req.PaymentMethod,
		Category:             req.Category,
		Currency:             currency,
		SubtotalAmount:       subtotalEuros,
		VatAmount:            vatEuros,
		TotalAmount:          totalEuros,
		VatLines:             req.VatLines,
		LineItems:            req.LineItems,
		ReceiptURL:           receiptURL,
		ReceiptContentType:   receiptContentType,
		ClientID:             req.ClientID,
		ClientName:           clientName,
		InvoiceID:            req.InvoiceID,
		InvoiceNumber:        invoiceNumber,
		Notes:                req.Notes,
		CreatedAt:            now,
		UpdatedAt:            now,
		CompanyID:            companyID,
		ReceiptFilePath:      receiptFilePath,
	}

	if expense.VatLines == nil {
		expense.VatLines = []model.ExpenseVatLine{}
	}
	if expense.LineItems == nil {
		expense.LineItems = []model.ExpenseLineItem{}
	}

	if err := s.expenseRepo.Create(ctx, expense); err != nil {
		return nil, fmt.Errorf("failed to save expense: %w", err)
	}

	return expense, nil
}

func (s *expenseService) GetExpense(ctx context.Context, companyID, id string) (*model.Expense, error) {
	if companyID == "" || id == "" {
		return nil, errors.New("company ID and expense ID are required")
	}
	return s.expenseRepo.GetByID(ctx, companyID, id)
}

func (s *expenseService) ListExpenses(ctx context.Context, companyID string, status *string, search *string) ([]*model.Expense, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}
	return s.expenseRepo.List(ctx, companyID, status, search)
}

func (s *expenseService) UpdateExpense(ctx context.Context, companyID, id string, req *model.UpdateExpenseRequest) (*model.Expense, error) {
	if companyID == "" || id == "" {
		return nil, errors.New("company ID and expense ID are required")
	}

	expense, err := s.expenseRepo.GetByID(ctx, companyID, id)
	if err != nil {
		return nil, err
	}

	if req.Status != nil {
		if !isValidStatus(*req.Status) {
			return nil, ErrInvalidStatus
		}
		expense.Status = *req.Status
	}

	if req.MerchantName != nil {
		clean := strings.TrimSpace(*req.MerchantName)
		if clean == "" {
			return nil, ErrInvalidMerchantName
		}
		expense.MerchantName = clean
	}

	if req.MerchantAddress != nil {
		expense.MerchantAddress = req.MerchantAddress
	}
	if req.ReceiptDate != nil {
		expense.ReceiptDate = req.ReceiptDate
	}
	if req.PaymentMethod != nil {
		expense.PaymentMethod = req.PaymentMethod
	}
	if req.Category != nil {
		expense.Category = req.Category
	}

	if req.TotalAmount != nil {
		tc := EurosToCents(*req.TotalAmount)
		te := CentsToEuros(tc)
		expense.TotalAmount = te
	}
	if req.SubtotalAmount != nil {
		st := CentsToEuros(EurosToCents(*req.SubtotalAmount))
		expense.SubtotalAmount = &st
	}
	if req.VatAmount != nil {
		vt := CentsToEuros(EurosToCents(*req.VatAmount))
		expense.VatAmount = &vt
	}

	if req.VatLines != nil {
		expense.VatLines = *req.VatLines
	}
	if req.LineItems != nil {
		expense.LineItems = *req.LineItems
	}

	if req.ClientID != nil {
		expense.ClientID = req.ClientID
		if *req.ClientID != "" {
			client, err := s.clientRepo.GetClientByID(ctx, companyID, *req.ClientID)
			if err == nil && client != nil {
				expense.ClientName = &client.Name
			}
		} else {
			expense.ClientName = nil
		}
	}

	if req.InvoiceID != nil {
		expense.InvoiceID = req.InvoiceID
		if *req.InvoiceID != "" {
			inv, err := s.clientRepo.GetInvoiceByID(ctx, companyID, *req.InvoiceID)
			if err == nil && inv != nil {
				expense.InvoiceNumber = &inv.InvoiceNumber
			}
		} else {
			expense.InvoiceNumber = nil
		}
	}

	if req.Notes != nil {
		expense.Notes = req.Notes
	}
	if req.RejectionReason != nil {
		expense.RejectionReason = req.RejectionReason
	}

	expense.UpdatedAt = time.Now().UTC()

	if err := s.expenseRepo.Update(ctx, expense); err != nil {
		return nil, fmt.Errorf("failed to update expense: %w", err)
	}

	return expense, nil
}

func (s *expenseService) DeleteExpense(ctx context.Context, companyID, id string) error {
	if companyID == "" || id == "" {
		return errors.New("company ID and expense ID are required")
	}
	return s.expenseRepo.Delete(ctx, companyID, id)
}

func (s *expenseService) GetReceiptFile(ctx context.Context, companyID, fileID string) (string, string, error) {
	// Strip optional extension if passed, e.g. "rec_123.jpg" -> "rec_123"
	ext := filepath.Ext(fileID)
	cleanFileID := strings.TrimSuffix(fileID, ext)
	return s.expenseRepo.GetReceiptFile(companyID, cleanFileID)
}

func (s *expenseService) ListClients(ctx context.Context, companyID string) ([]*model.Client, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}
	return s.clientRepo.ListClients(ctx, companyID)
}

func (s *expenseService) ListInvoices(ctx context.Context, companyID string, clientID *string) ([]*model.Invoice, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}
	return s.clientRepo.ListInvoices(ctx, companyID, clientID)
}

func (s *expenseService) processBase64Receipt(companyID, fileID, dataURI string) (string, string, string, error) {
	parts := strings.SplitN(dataURI, ",", 2)
	if len(parts) != 2 {
		return "", "", "", errors.New("invalid data URL format")
	}

	header := parts[0]
	encoded := parts[1]

	var mimeType string
	if strings.HasPrefix(header, "data:") && strings.HasSuffix(header, ";base64") {
		mimeType = strings.TrimSuffix(strings.TrimPrefix(header, "data:"), ";base64")
	} else {
		mimeType = "application/octet-stream"
	}

	var ext string
	switch strings.ToLower(mimeType) {
	case "image/jpeg", "image/jpg":
		ext = ".jpg"
		mimeType = "image/jpeg"
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	case "image/heic":
		ext = ".heic"
	case "application/pdf":
		ext = ".pdf"
	default:
		return "", "", "", ErrUnsupportedReceiptType
	}

	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to decode receipt base64: %w", err)
	}

	if len(decoded) > maxReceiptFileSize {
		return "", "", "", ErrReceiptTooLarge
	}

	savedPath, err := s.expenseRepo.SaveReceiptFile(companyID, fileID, ext, decoded)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to save receipt file: %w", err)
	}

	publicURL := fmt.Sprintf("/api/v1/receipts/%s%s", fileID, ext)
	return savedPath, publicURL, mimeType, nil
}

func isValidStatus(status model.ExpenseStatus) bool {
	switch status {
	case model.ExpenseStatusProcessing,
		model.ExpenseStatusNeedsReview,
		model.ExpenseStatusApproved,
		model.ExpenseStatusRejected:
		return true
	default:
		return false
	}
}

// EurosToCents converts decimal euros (e.g. 42.10) to integer cents (4210) safely.
func EurosToCents(euros float64) int64 {
	return int64(math.Round(euros * 100))
}

// CentsToEuros converts integer cents (4210) to decimal euros (42.10).
func CentsToEuros(cents int64) float64 {
	return float64(cents) / 100.0
}

