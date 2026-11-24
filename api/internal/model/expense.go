package model

import (
	"time"
)

// ExpenseStatus defines valid lifecycle states for an expense.
type ExpenseStatus string

const (
	ExpenseStatusProcessing  ExpenseStatus = "processing"
	ExpenseStatusNeedsReview ExpenseStatus = "needs_review"
	ExpenseStatusApproved    ExpenseStatus = "approved"
	ExpenseStatusRejected    ExpenseStatus = "rejected"
)

// ExpenseVatLine represents VAT breakdown for a specific rate.
type ExpenseVatLine struct {
	Rate       float64 `json:"rate"`
	BaseAmount float64 `json:"base_amount"`
	VatAmount  float64 `json:"vat_amount"`
}

// ExpenseLineItem represents an individual line item on a receipt.
type ExpenseLineItem struct {
	Description string   `json:"description"`
	Quantity    float64  `json:"quantity"`
	UnitPrice   float64  `json:"unit_price"`
	TotalPrice  float64  `json:"total_price"`
	VatRate     *float64 `json:"vat_rate"`
}

// Expense represents a company business expense / receipt.
type Expense struct {
	ID                   string            `json:"id"`
	Status               ExpenseStatus     `json:"status"`
	Source               string            `json:"source"` // "whatsapp", "upload", "manual"
	SenderName           *string           `json:"sender_name"`
	SenderPhone          *string           `json:"sender_phone"`
	MerchantName         string            `json:"merchant_name"`
	MerchantAddress      *string           `json:"merchant_address"`
	ReceiptDate          *string           `json:"receipt_date"` // YYYY-MM-DD
	PaymentMethod        *string           `json:"payment_method"`
	Category             *string           `json:"category"`
	Currency             string            `json:"currency"` // ISO 4217, default "EUR"
	SubtotalAmount       *float64          `json:"subtotal_amount"`
	VatAmount            *float64          `json:"vat_amount"`
	TotalAmount          float64           `json:"total_amount"`
	VatLines             []ExpenseVatLine  `json:"vat_lines"`
	LineItems            []ExpenseLineItem `json:"line_items"`
	ReceiptURL           string            `json:"receipt_url"`
	ReceiptContentType   *string           `json:"receipt_content_type"`
	ExtractionConfidence *float64          `json:"extraction_confidence"`
	ClientID             *string           `json:"client_id"`
	ClientName           *string           `json:"client_name"`
	InvoiceID            *string           `json:"invoice_id"`
	InvoiceNumber        *string           `json:"invoice_number"`
	Notes                *string           `json:"notes"`
	RejectionReason      *string           `json:"rejection_reason"`
	CreatedAt            time.Time         `json:"created_at"`
	UpdatedAt            time.Time         `json:"updated_at"`

	// Internal fields
	CompanyID       string `json:"-"`
	ReceiptFilePath string `json:"-"`
}

// CreateExpenseRequest contains the payload for creating an expense manually or via upload.
type CreateExpenseRequest struct {
	MerchantName       string            `json:"merchant_name"`
	MerchantAddress    *string           `json:"merchant_address"`
	ReceiptDate        *string           `json:"receipt_date"`
	PaymentMethod      *string           `json:"payment_method"`
	Category           *string           `json:"category"`
	Currency           string            `json:"currency"`
	SubtotalAmount     *float64          `json:"subtotal_amount"`
	VatAmount          *float64          `json:"vat_amount"`
	TotalAmount        float64           `json:"total_amount"`
	VatLines           []ExpenseVatLine  `json:"vat_lines"`
	LineItems          []ExpenseLineItem `json:"line_items"`
	ReceiptURL         string            `json:"receipt_url"`
	ReceiptContentType *string           `json:"receipt_content_type"`
	ClientID           *string           `json:"client_id"`
	ClientName         *string           `json:"client_name"`
	InvoiceID          *string           `json:"invoice_id"`
	InvoiceNumber      *string           `json:"invoice_number"`
	Notes              *string           `json:"notes"`
	Status             *ExpenseStatus    `json:"status"`
	Source             *string           `json:"source"`
}

// UpdateExpenseRequest contains the partial fields allowed when updating an expense.
type UpdateExpenseRequest struct {
	Status          *ExpenseStatus     `json:"status"`
	MerchantName    *string            `json:"merchant_name"`
	MerchantAddress *string            `json:"merchant_address"`
	ReceiptDate     *string            `json:"receipt_date"`
	PaymentMethod   *string            `json:"payment_method"`
	Category        *string            `json:"category"`
	SubtotalAmount  *float64           `json:"subtotal_amount"`
	VatAmount       *float64           `json:"vat_amount"`
	TotalAmount     *float64           `json:"total_amount"`
	VatLines        *[]ExpenseVatLine  `json:"vat_lines"`
	LineItems       *[]ExpenseLineItem `json:"line_items"`
	ClientID        *string            `json:"client_id"`
	InvoiceID       *string            `json:"invoice_id"`
	Notes           *string            `json:"notes"`
	RejectionReason *string            `json:"rejection_reason"`
}

