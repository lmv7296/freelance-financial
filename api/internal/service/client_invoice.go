package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
)

var (
	ErrClientNameRequired      = errors.New("name is required")
	ErrInvalidClientType       = errors.New("type must be one of: particulier, bedrijf")
	ErrInvalidClientEmail      = errors.New("email must be a valid email address")
	ErrInvoiceClientRequired   = errors.New("client_id is required and must be an existing client")
	ErrInvalidInvoiceStatus    = errors.New("status must be one of: DRAFT, SENT, PAID, CANCELLED")
	ErrInvalidNewInvoiceStatus = errors.New("a new invoice must have status DRAFT, SENT or PAID")
	ErrInvalidInvoiceDate      = errors.New("dates must be valid dates in YYYY-MM-DD format")
	ErrDueBeforeIssue          = errors.New("due_date cannot be before issue_date")
	ErrInvoiceNumberTaken      = errors.New("invoice_number is already used by another invoice")
	ErrInvoiceLineItems        = errors.New("line_items needs at least one line with a quantity above 0 and a unit price of 0 or more")
	ErrInvalidInvoiceVatRate   = errors.New("vat_rate must be between 0 and 100")
)

// ValidationError marks a problem with the request's input (HTTP 422).
// The underlying error stays reachable with errors.Is.
type ValidationError struct{ Err error }

func (e *ValidationError) Error() string { return e.Err.Error() }
func (e *ValidationError) Unwrap() error { return e.Err }

// invoiceInputErrors are the errors CreateInvoice/UpdateInvoice return for bad input.
var invoiceInputErrors = []error{
	ErrInvoiceClientRequired, ErrInvalidInvoiceStatus, ErrInvalidNewInvoiceStatus,
	ErrInvalidInvoiceDate, ErrDueBeforeIssue, ErrInvoiceNumberTaken,
	ErrInvoiceLineItems, ErrInvalidInvoiceVatRate,
}

func asInvoiceInputError(err error) error {
	for _, target := range invoiceInputErrors {
		if errors.Is(err, target) {
			return &ValidationError{Err: err}
		}
	}
	return err
}

// ClientInvoiceService creates and updates clients and invoices.
// Listing stays on ExpenseService, which already served GET /clients and /invoices.
type ClientInvoiceService interface {
	CreateClient(ctx context.Context, companyID string, input *model.ClientInput) (*model.Client, error)
	UpdateClient(ctx context.Context, companyID, clientID string, input *model.ClientInput) (*model.Client, error)
	CreateInvoice(ctx context.Context, companyID string, req *model.CreateInvoiceRequest) (*model.Invoice, error)
	UpdateInvoice(ctx context.Context, companyID, invoiceID string, req *model.UpdateInvoiceRequest) (*model.Invoice, error)
}

type clientInvoiceService struct {
	clientRepo   repository.ClientInvoiceRepository
	settingsRepo repository.SettingsRepository
	now          func() time.Time
}

// NewClientInvoiceService builds the service. settingsRepo provides invoice
// numbering, payment term and default VAT rate (from Settings → Invoices).
func NewClientInvoiceService(
	clientRepo repository.ClientInvoiceRepository,
	settingsRepo repository.SettingsRepository,
) ClientInvoiceService {
	return &clientInvoiceService{clientRepo: clientRepo, settingsRepo: settingsRepo, now: time.Now}
}

// today is the calendar date in the Netherlands, so an invoice made late in
// the evening isn't dated tomorrow (or yesterday) because of UTC.
func (s *clientInvoiceService) today() time.Time {
	now := s.now()
	if loc, err := time.LoadLocation("Europe/Amsterdam"); err == nil {
		now = now.In(loc)
	}
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
}

// ---------- Clients ----------

func (s *clientInvoiceService) CreateClient(ctx context.Context, companyID string, input *model.ClientInput) (*model.Client, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}
	client := &model.Client{
		ID:        "cli_" + generateSecureID(12),
		CompanyID: companyID,
		Type:      model.ClientTypePrivate,
		CreatedAt: s.now().UTC(),
	}
	if err := applyClientInput(client, input); err != nil {
		return nil, &ValidationError{Err: err}
	}
	if err := s.clientRepo.CreateClient(ctx, client); err != nil {
		return nil, fmt.Errorf("create client: %w", err)
	}
	return client, nil
}

func (s *clientInvoiceService) UpdateClient(ctx context.Context, companyID, clientID string, input *model.ClientInput) (*model.Client, error) {
	client, err := s.clientRepo.GetClientByID(ctx, companyID, clientID)
	if err != nil {
		return nil, err
	}
	updated := *client
	if err := applyClientInput(&updated, input); err != nil {
		return nil, &ValidationError{Err: err}
	}
	if err := s.clientRepo.UpdateClient(ctx, &updated); err != nil {
		return nil, err
	}
	return &updated, nil
}

// applyClientInput validates the given fields and copies them onto client.
// Nil fields are left as they are; an empty string clears an optional field.
func applyClientInput(client *model.Client, in *model.ClientInput) error {
	if in == nil {
		in = &model.ClientInput{}
	}
	if in.Type != nil {
		t := strings.TrimSpace(*in.Type)
		if t != model.ClientTypePrivate && t != model.ClientTypeBusiness {
			return ErrInvalidClientType
		}
		client.Type = t
	}
	if in.Name != nil {
		client.Name = strings.TrimSpace(*in.Name)
	}
	if client.Name == "" {
		return ErrClientNameRequired
	}
	if in.Email != nil {
		email := strings.TrimSpace(*in.Email)
		if email != "" {
			addr, err := mail.ParseAddress(email)
			if err != nil || addr.Address != email {
				return ErrInvalidClientEmail
			}
			email = strings.ToLower(email)
		}
		client.Email = email
	}
	if in.Phone != nil {
		phone := strings.TrimSpace(*in.Phone)
		if phone != "" {
			normalized, err := NormalizePhoneE164(phone)
			if err != nil {
				return err
			}
			phone = normalized
		}
		client.Phone = phone
	}
	if in.KvkNumber != nil {
		kvk := strings.ReplaceAll(strings.TrimSpace(*in.KvkNumber), " ", "")
		if err := ValidateKVK(kvk); err != nil {
			return err
		}
		client.KvkNumber = kvk
	}
	if in.VatNumber != nil {
		vat, err := ValidateVAT(*in.VatNumber, vatCountry(*in.VatNumber))
		if err != nil {
			return err
		}
		client.VatNumber = vat
	}
	if in.ContactPerson != nil {
		client.ContactPerson = strings.TrimSpace(*in.ContactPerson)
	}
	if in.AddressLine1 != nil {
		client.AddressLine1 = strings.TrimSpace(*in.AddressLine1)
	}
	if in.AddressLine2 != nil {
		client.AddressLine2 = strings.TrimSpace(*in.AddressLine2)
	}
	if in.SiteNote != nil {
		client.SiteNote = strings.TrimSpace(*in.SiteNote)
	}
	// Business-only details don't belong on a private client
	if client.Type == model.ClientTypePrivate {
		client.KvkNumber = ""
		client.VatNumber = ""
		client.ContactPerson = ""
	}
	return nil
}

// vatCountry picks the validation rules from the VAT number's prefix, so
// foreign business clients (e.g. a Belgian BE0123456789) are accepted too.
func vatCountry(vat string) string {
	clean := strings.ToUpper(strings.TrimSpace(vat))
	if len(clean) >= 2 && clean[0] >= 'A' && clean[0] <= 'Z' && clean[1] >= 'A' && clean[1] <= 'Z' {
		return clean[:2]
	}
	return "NL"
}

// ---------- Invoices ----------

func (s *clientInvoiceService) CreateInvoice(ctx context.Context, companyID string, req *model.CreateInvoiceRequest) (*model.Invoice, error) {
	invoice, err := s.createInvoice(ctx, companyID, req)
	return invoice, asInvoiceInputError(err)
}

func (s *clientInvoiceService) UpdateInvoice(ctx context.Context, companyID, invoiceID string, req *model.UpdateInvoiceRequest) (*model.Invoice, error) {
	invoice, err := s.updateInvoice(ctx, companyID, invoiceID, req)
	return invoice, asInvoiceInputError(err)
}

func (s *clientInvoiceService) createInvoice(ctx context.Context, companyID string, req *model.CreateInvoiceRequest) (*model.Invoice, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}
	if req == nil {
		req = &model.CreateInvoiceRequest{}
	}

	client, err := s.clientRepo.GetClientByID(ctx, companyID, strings.TrimSpace(req.ClientID))
	if err != nil {
		if errors.Is(err, repository.ErrClientNotFound) {
			return nil, ErrInvoiceClientRequired
		}
		return nil, err
	}

	status := strings.ToUpper(strings.TrimSpace(req.Status))
	if status == "" {
		status = model.InvoiceStatusSent
	}
	if status != model.InvoiceStatusDraft && status != model.InvoiceStatusSent && status != model.InvoiceStatusPaid {
		return nil, ErrInvalidNewInvoiceStatus
	}

	defaults, err := s.settingsRepo.GetInvoiceDefaults(ctx, companyID)
	if err != nil {
		return nil, fmt.Errorf("get invoice defaults: %w", err)
	}

	issueDate := s.today()
	if req.IssueDate != "" {
		if issueDate, err = parseInvoiceDate(req.IssueDate); err != nil {
			return nil, err
		}
	}
	termDays := defaults.PaymentTermDays
	if termDays < 1 {
		termDays = 14
	}
	dueDate := issueDate.AddDate(0, 0, termDays)
	if req.DueDate != "" {
		if dueDate, err = parseInvoiceDate(req.DueDate); err != nil {
			return nil, err
		}
	}
	if dueDate.Before(issueDate) {
		return nil, ErrDueBeforeIssue
	}

	vatRate := float64(defaults.DefaultVatRate)
	if req.VatRate != nil {
		vatRate = *req.VatRate
	}
	if vatRate < 0 || vatRate > 100 || math.IsNaN(vatRate) {
		return nil, ErrInvalidInvoiceVatRate
	}

	lineItems, subtotal, err := calculateLineItems(req.LineItems)
	if err != nil {
		return nil, err
	}
	vatCents := int64(math.Round(float64(subtotal) * vatRate / 100))

	existing, err := s.clientRepo.ListInvoices(ctx, companyID, nil)
	if err != nil {
		return nil, fmt.Errorf("list invoices: %w", err)
	}
	number := strings.TrimSpace(req.InvoiceNumber)
	if number == "" {
		number = nextInvoiceNumber(defaults, existing)
	} else {
		for _, inv := range existing {
			if strings.EqualFold(inv.InvoiceNumber, number) {
				return nil, ErrInvoiceNumberTaken
			}
		}
	}

	invoice := &model.Invoice{
		ID:             "inv_" + generateSecureID(12),
		CompanyID:      companyID,
		ClientID:       client.ID,
		ClientName:     client.Name,
		InvoiceNumber:  number,
		IssueDate:      issueDate.Format(time.DateOnly),
		DueDate:        dueDate.Format(time.DateOnly),
		Status:         status,
		Currency:       "EUR",
		Description:    strings.TrimSpace(req.Description),
		TradeType:      strings.TrimSpace(req.TradeType),
		PaymentMethod:  strings.TrimSpace(req.PaymentMethod),
		LineItems:      lineItems,
		SubtotalCents:  subtotal,
		VatRate:        vatRate,
		VatAmountCents: vatCents,
		TotalCents:     subtotal + vatCents,
		CreatedAt:      s.now().UTC(),
	}
	if status == model.InvoiceStatusPaid {
		paidAt := invoice.IssueDate
		invoice.PaidAt = &paidAt
	}

	if err := s.clientRepo.CreateInvoice(ctx, invoice); err != nil {
		return nil, fmt.Errorf("create invoice: %w", err)
	}

	// Keep Settings → Invoices "next number" ahead of the numbers in use
	if used := extractNumericSuffix(number); used >= defaults.NextNumber {
		defaults.NextNumber = used + 1
		if err := s.settingsRepo.UpdateInvoiceDefaults(ctx, companyID, defaults); err != nil {
			return nil, fmt.Errorf("advance invoice number: %w", err)
		}
	}
	return invoice, nil
}

func (s *clientInvoiceService) updateInvoice(ctx context.Context, companyID, invoiceID string, req *model.UpdateInvoiceRequest) (*model.Invoice, error) {
	invoice, err := s.clientRepo.GetInvoiceByID(ctx, companyID, invoiceID)
	if err != nil {
		return nil, err
	}
	if req == nil {
		req = &model.UpdateInvoiceRequest{}
	}

	if req.DueDate != nil {
		due, err := parseInvoiceDate(*req.DueDate)
		if err != nil {
			return nil, err
		}
		if invoice.IssueDate != "" && due.Format(time.DateOnly) < invoice.IssueDate {
			return nil, ErrDueBeforeIssue
		}
		invoice.DueDate = due.Format(time.DateOnly)
	}

	if req.Status != nil {
		status := strings.ToUpper(strings.TrimSpace(*req.Status))
		switch status {
		case model.InvoiceStatusDraft, model.InvoiceStatusSent, model.InvoiceStatusPaid, model.InvoiceStatusCancelled:
		default:
			return nil, ErrInvalidInvoiceStatus
		}
		invoice.Status = status
	}

	if invoice.Status == model.InvoiceStatusPaid {
		switch {
		case req.PaidAt != nil && *req.PaidAt != "":
			paid, err := parseInvoiceDate(*req.PaidAt)
			if err != nil {
				return nil, err
			}
			paidAt := paid.Format(time.DateOnly)
			invoice.PaidAt = &paidAt
		case invoice.PaidAt == nil:
			paidAt := s.today().Format(time.DateOnly)
			invoice.PaidAt = &paidAt
		}
	} else {
		// Only paid invoices have a payment date
		invoice.PaidAt = nil
	}

	if err := s.clientRepo.UpdateInvoiceStatus(ctx, invoice); err != nil {
		return nil, err
	}
	return invoice, nil
}

func parseInvoiceDate(value string) (time.Time, error) {
	t, err := time.Parse(time.DateOnly, strings.TrimSpace(value))
	if err != nil {
		return time.Time{}, ErrInvalidInvoiceDate
	}
	return t, nil
}

// calculateLineItems validates the lines and sets each line's total.
// Returns the lines and the subtotal (excl. VAT) in cents.
func calculateLineItems(items []model.InvoiceLineItem) ([]model.InvoiceLineItem, int64, error) {
	if len(items) == 0 {
		return nil, 0, ErrInvoiceLineItems
	}
	result := make([]model.InvoiceLineItem, 0, len(items))
	var subtotal int64
	for _, it := range items {
		if !(it.Quantity > 0) || math.IsInf(it.Quantity, 0) || it.UnitPriceCents < 0 {
			return nil, 0, ErrInvoiceLineItems
		}
		it.Description = strings.TrimSpace(it.Description)
		it.TotalCents = int64(math.Round(it.Quantity * float64(it.UnitPriceCents)))
		subtotal += it.TotalCents
		result = append(result, it)
	}
	return result, subtotal, nil
}

// nextInvoiceNumber formats Settings → Invoices "next number" with its prefix
// and padding, skipping past any number already in use.
func nextInvoiceNumber(defaults *model.InvoiceDefaults, existing []*model.Invoice) string {
	next := defaults.NextNumber
	if next < 1 {
		next = 1
	}
	for _, inv := range existing {
		if n := extractNumericSuffix(inv.InvoiceNumber); n >= next {
			next = n + 1
		}
	}
	padding := defaults.NumberPadding
	if padding < 1 {
		padding = 4
	}
	digits := strconv.Itoa(next)
	if len(digits) < padding {
		digits = strings.Repeat("0", padding-len(digits)) + digits
	}
	return defaults.NumberPrefix + digits
}
