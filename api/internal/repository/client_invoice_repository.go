package repository

import (
	"context"
	"errors"
	"sort"
	"sync"
	"time"

	"go-freelancer/internal/model"
)

var (
	ErrClientNotFound  = errors.New("client not found")
	ErrInvoiceNotFound = errors.New("invoice not found")
)

// ClientInvoiceRepository defines operations for managing clients and invoices.
type ClientInvoiceRepository interface {
	ListClients(ctx context.Context, companyID string) ([]*model.Client, error)
	GetClientByID(ctx context.Context, companyID, clientID string) (*model.Client, error)
	CreateClient(ctx context.Context, client *model.Client) error
	UpdateClient(ctx context.Context, client *model.Client) error

	ListInvoices(ctx context.Context, companyID string, clientID *string) ([]*model.Invoice, error)
	GetInvoiceByID(ctx context.Context, companyID, invoiceID string) (*model.Invoice, error)
	CreateInvoice(ctx context.Context, invoice *model.Invoice) error
	// UpdateInvoiceStatus saves the lifecycle fields: status, due_date and paid_at.
	UpdateInvoiceStatus(ctx context.Context, invoice *model.Invoice) error
}

// MemoryClientInvoiceRepository is a thread-safe in-memory store for clients and invoices.
type MemoryClientInvoiceRepository struct {
	mu       sync.RWMutex
	clients  map[string]*model.Client  // ID -> Client
	invoices map[string]*model.Invoice // ID -> Invoice
}

// NewMemoryClientInvoiceRepository creates a new in-memory client & invoice repository.
func NewMemoryClientInvoiceRepository() *MemoryClientInvoiceRepository {
	return &MemoryClientInvoiceRepository{
		clients:  make(map[string]*model.Client),
		invoices: make(map[string]*model.Invoice),
	}
}

func (r *MemoryClientInvoiceRepository) ListClients(ctx context.Context, companyID string) ([]*model.Client, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*model.Client
	for _, c := range r.clients {
		if c.CompanyID == companyID {
			cp := *c
			result = append(result, &cp)
		}
	}
	// Same order as the Postgres repository
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}

func (r *MemoryClientInvoiceRepository) GetClientByID(ctx context.Context, companyID, clientID string) (*model.Client, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	c, ok := r.clients[clientID]
	if !ok || c.CompanyID != companyID {
		return nil, ErrClientNotFound
	}
	return c, nil
}

func (r *MemoryClientInvoiceRepository) CreateClient(ctx context.Context, client *model.Client) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	cp := *client
	r.clients[client.ID] = &cp
	return nil
}

func (r *MemoryClientInvoiceRepository) UpdateClient(ctx context.Context, client *model.Client) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, ok := r.clients[client.ID]
	if !ok || existing.CompanyID != client.CompanyID {
		return ErrClientNotFound
	}
	cp := *client
	r.clients[client.ID] = &cp
	return nil
}

func (r *MemoryClientInvoiceRepository) UpdateInvoiceStatus(ctx context.Context, invoice *model.Invoice) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, ok := r.invoices[invoice.ID]
	if !ok || existing.CompanyID != invoice.CompanyID {
		return ErrInvoiceNotFound
	}
	existing.Status = invoice.Status
	existing.DueDate = invoice.DueDate
	existing.PaidAt = invoice.PaidAt
	return nil
}

func (r *MemoryClientInvoiceRepository) ListInvoices(ctx context.Context, companyID string, clientID *string) ([]*model.Invoice, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*model.Invoice
	for _, inv := range r.invoices {
		if inv.CompanyID == companyID {
			if clientID == nil || *clientID == "" || inv.ClientID == *clientID {
				// Enrich ClientName if possible
				cp := *inv
				if cp.ClientName == "" && cp.ClientID != "" {
					if c, ok := r.clients[cp.ClientID]; ok {
						cp.ClientName = c.Name
					}
				}
				result = append(result, &cp)
			}
		}
	}
	// Same order as the Postgres repository: newest issue date first
	sort.Slice(result, func(i, j int) bool {
		if result[i].IssueDate != result[j].IssueDate {
			return result[i].IssueDate > result[j].IssueDate
		}
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})
	return result, nil
}

func (r *MemoryClientInvoiceRepository) GetInvoiceByID(ctx context.Context, companyID, invoiceID string) (*model.Invoice, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	inv, ok := r.invoices[invoiceID]
	if !ok || inv.CompanyID != companyID {
		return nil, ErrInvoiceNotFound
	}
	cp := *inv
	if cp.ClientName == "" && cp.ClientID != "" {
		if c, ok := r.clients[cp.ClientID]; ok {
			cp.ClientName = c.Name
		}
	}
	return &cp, nil
}

func (r *MemoryClientInvoiceRepository) CreateInvoice(ctx context.Context, invoice *model.Invoice) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	cp := *invoice
	if cp.Status == "" {
		cp.Status = model.InvoiceStatusSent
	}
	if cp.Currency == "" {
		cp.Currency = "EUR"
	}
	if cp.DueDate == "" {
		if cp.IssueDate != "" {
			if t, err := time.Parse("2006-01-02", cp.IssueDate); err == nil {
				cp.DueDate = t.AddDate(0, 0, 14).Format("2006-01-02")
			}
		}
		if cp.DueDate == "" {
			cp.DueDate = time.Now().UTC().AddDate(0, 0, 14).Format("2006-01-02")
		}
	}
	if cp.ClientName == "" && cp.ClientID != "" {
		if c, ok := r.clients[cp.ClientID]; ok {
			cp.ClientName = c.Name
		}
	}
	r.invoices[invoice.ID] = &cp
	return nil
}

