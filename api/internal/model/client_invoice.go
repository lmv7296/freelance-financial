package model

import "time"

// Client types
const (
	ClientTypePrivate  = "particulier"
	ClientTypeBusiness = "bedrijf"
)

// Client represents a business customer/client.
type Client struct {
	ID            string    `json:"id"`
	CompanyID     string    `json:"-"`
	Type          string    `json:"type"` // particulier, bedrijf
	Name          string    `json:"name"`
	Email         string    `json:"email,omitempty"`
	Phone         string    `json:"phone,omitempty"`
	KvkNumber     string    `json:"kvk_number,omitempty"`
	VatNumber     string    `json:"vat_number,omitempty"`
	ContactPerson string    `json:"contact_person,omitempty"`
	AddressLine1  string    `json:"address_line1,omitempty"`
	AddressLine2  string    `json:"address_line2,omitempty"`
	SiteNote      string    `json:"site_note,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

// ClientInput is the request body for POST /api/v1/clients and
// PATCH /api/v1/clients/{id}. On PATCH, nil fields are left unchanged.
type ClientInput struct {
	Type          *string `json:"type"`
	Name          *string `json:"name"`
	Email         *string `json:"email"`
	Phone         *string `json:"phone"`
	KvkNumber     *string `json:"kvk_number"`
	VatNumber     *string `json:"vat_number"`
	ContactPerson *string `json:"contact_person"`
	AddressLine1  *string `json:"address_line1"`
	AddressLine2  *string `json:"address_line2"`
	SiteNote      *string `json:"site_note"`
}

// InvoiceStatus constants
const (
	InvoiceStatusDraft     = "DRAFT"
	InvoiceStatusSent      = "SENT"
	InvoiceStatusPaid      = "PAID"
	InvoiceStatusCancelled = "CANCELLED"
)

// InvoiceLineItem is one line on an invoice. Amounts are in cents.
type InvoiceLineItem struct {
	Description    string  `json:"description"`
	Quantity       float64 `json:"quantity"`
	UnitPriceCents int64   `json:"unit_price_cents"`
	TotalCents     int64   `json:"total_cents"` // quantity × unit price, set by the server
}

// Invoice represents an invoice issued to a client.
type Invoice struct {
	ID             string            `json:"id"`
	CompanyID      string            `json:"-"`
	ClientID       string            `json:"client_id"`
	ClientName     string            `json:"client_name,omitempty"`
	InvoiceNumber  string            `json:"invoice_number"`
	IssueDate      string            `json:"issue_date,omitempty"` // YYYY-MM-DD
	DueDate        string            `json:"due_date,omitempty"`   // YYYY-MM-DD
	Status         string            `json:"status"`               // DRAFT, SENT, PAID, CANCELLED
	PaidAt         *string           `json:"paid_at,omitempty"`    // YYYY-MM-DD
	Currency       string            `json:"currency,omitempty"`
	Description    string            `json:"description,omitempty"`
	TradeType      string            `json:"trade_type,omitempty"`
	PaymentMethod  string            `json:"payment_method,omitempty"`
	LineItems      []InvoiceLineItem `json:"line_items"`
	SubtotalCents  int64             `json:"subtotal_cents,omitempty"`
	VatRate        float64           `json:"vat_rate,omitempty"`
	VatAmountCents int64             `json:"vat_amount_cents,omitempty"`
	TotalCents     int64             `json:"total_cents,omitempty"`
	CreatedAt      time.Time         `json:"-"`
}

// CreateInvoiceRequest is the request body for POST /api/v1/invoices.
// Totals are always calculated by the server from the line items.
type CreateInvoiceRequest struct {
	ClientID      string            `json:"client_id"`
	InvoiceNumber string            `json:"invoice_number"` // empty: next number from the invoice settings
	IssueDate     string            `json:"issue_date"`     // empty: today
	DueDate       string            `json:"due_date"`       // empty: issue date + payment term
	Status        string            `json:"status"`         // DRAFT, SENT (default) or PAID
	Description   string            `json:"description"`
	TradeType     string            `json:"trade_type"`
	PaymentMethod string            `json:"payment_method"`
	VatRate       *float64          `json:"vat_rate"` // nil: default rate from the invoice settings
	LineItems     []InvoiceLineItem `json:"line_items"`
}

// UpdateInvoiceRequest is the request body for PATCH /api/v1/invoices/{id}.
// Only the lifecycle fields can change once an invoice exists.
type UpdateInvoiceRequest struct {
	Status  *string `json:"status"`
	DueDate *string `json:"due_date"`
	PaidAt  *string `json:"paid_at"` // with status PAID; empty: today
}
