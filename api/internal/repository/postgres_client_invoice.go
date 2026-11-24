package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"go-freelancer/internal/model"
)

type PostgresClientInvoiceRepository struct {
	db *sql.DB
}

func NewPostgresClientInvoiceRepository(db *sql.DB) *PostgresClientInvoiceRepository {
	return &PostgresClientInvoiceRepository{db: db}
}

const clientColumns = `
	id, company_id, type, name, COALESCE(email, ''), COALESCE(phone, ''),
	COALESCE(kvk_number, ''), COALESCE(vat_number, ''), COALESCE(contact_person, ''),
	COALESCE(address_line1, ''), COALESCE(address_line2, ''), COALESCE(site_note, ''),
	created_at
`

// scanClient reads one row of clientColumns (rowScanner lives in postgres_expense.go).
func scanClient(row rowScanner) (*model.Client, error) {
	var c model.Client
	err := row.Scan(
		&c.ID, &c.CompanyID, &c.Type, &c.Name, &c.Email, &c.Phone,
		&c.KvkNumber, &c.VatNumber, &c.ContactPerson,
		&c.AddressLine1, &c.AddressLine2, &c.SiteNote,
		&c.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// nullIfEmpty stores optional text columns as NULL instead of an empty string.
func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func (r *PostgresClientInvoiceRepository) ListClients(ctx context.Context, companyID string) ([]*model.Client, error) {
	query := `SELECT ` + clientColumns + ` FROM clients WHERE company_id = $1 ORDER BY name ASC`
	rows, err := r.db.QueryContext(ctx, query, companyID)
	if err != nil {
		return nil, fmt.Errorf("list clients: %w", err)
	}
	defer rows.Close()

	clients := []*model.Client{}
	for rows.Next() {
		c, err := scanClient(rows)
		if err != nil {
			return nil, fmt.Errorf("scan client: %w", err)
		}
		clients = append(clients, c)
	}
	return clients, rows.Err()
}

func (r *PostgresClientInvoiceRepository) GetClientByID(ctx context.Context, companyID, id string) (*model.Client, error) {
	query := `SELECT ` + clientColumns + ` FROM clients WHERE company_id = $1 AND id = $2`
	c, err := scanClient(r.db.QueryRowContext(ctx, query, companyID, id))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrClientNotFound
		}
		return nil, err
	}
	return c, nil
}

func (r *PostgresClientInvoiceRepository) CreateClient(ctx context.Context, client *model.Client) error {
	if client.Type == "" {
		client.Type = model.ClientTypePrivate
	}
	query := `
		INSERT INTO clients (
			id, company_id, type, name, email, phone, kvk_number, vat_number,
			contact_person, address_line1, address_line2, site_note, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
		ON CONFLICT (id) DO NOTHING
	`
	_, err := r.db.ExecContext(ctx, query,
		client.ID, client.CompanyID, client.Type, client.Name,
		nullIfEmpty(client.Email), nullIfEmpty(client.Phone),
		nullIfEmpty(client.KvkNumber), nullIfEmpty(client.VatNumber),
		nullIfEmpty(client.ContactPerson), nullIfEmpty(client.AddressLine1),
		nullIfEmpty(client.AddressLine2), nullIfEmpty(client.SiteNote),
		client.CreatedAt,
	)
	return err
}

func (r *PostgresClientInvoiceRepository) UpdateClient(ctx context.Context, client *model.Client) error {
	query := `
		UPDATE clients SET
			type = $3, name = $4, email = $5, phone = $6, kvk_number = $7, vat_number = $8,
			contact_person = $9, address_line1 = $10, address_line2 = $11, site_note = $12,
			updated_at = NOW()
		WHERE company_id = $1 AND id = $2
	`
	res, err := r.db.ExecContext(ctx, query,
		client.CompanyID, client.ID, client.Type, client.Name,
		nullIfEmpty(client.Email), nullIfEmpty(client.Phone),
		nullIfEmpty(client.KvkNumber), nullIfEmpty(client.VatNumber),
		nullIfEmpty(client.ContactPerson), nullIfEmpty(client.AddressLine1),
		nullIfEmpty(client.AddressLine2), nullIfEmpty(client.SiteNote),
	)
	if err != nil {
		return fmt.Errorf("update client: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrClientNotFound
	}
	return nil
}

func (r *PostgresClientInvoiceRepository) CreateInvoice(ctx context.Context, invoice *model.Invoice) error {
	if invoice.Status == "" {
		invoice.Status = model.InvoiceStatusSent
	}
	if invoice.Currency == "" {
		invoice.Currency = "EUR"
	}
	if invoice.DueDate == "" {
		// Default to issue_date + 14 days (or from invoice_defaults if available)
		issueT, err := time.Parse("2006-01-02", invoice.IssueDate)
		if err != nil {
			issueT = time.Now().UTC()
		}
		var termDays int = 14
		_ = r.db.QueryRowContext(ctx, "SELECT payment_term_days FROM invoice_defaults WHERE company_id = $1", invoice.CompanyID).Scan(&termDays)
		if termDays <= 0 {
			termDays = 14
		}
		invoice.DueDate = issueT.AddDate(0, 0, termDays).Format("2006-01-02")
	}
	lineItems := invoice.LineItems
	if lineItems == nil {
		lineItems = []model.InvoiceLineItem{}
	}
	lineItemsJSON, err := json.Marshal(lineItems)
	if err != nil {
		return fmt.Errorf("encode line items: %w", err)
	}
	vatRate := invoice.VatRate
	if vatRate == 0 && invoice.VatAmountCents == 0 && invoice.SubtotalCents == 0 {
		vatRate = 21
	}

	query := `
		INSERT INTO company_invoices (
			id, company_id, client_id, invoice_number, issue_date, due_date, status, paid_at, currency,
			description, trade_type, payment_method, vat_rate, line_items,
			subtotal_cents, vat_cents, total_cents, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18)
		ON CONFLICT (id) DO NOTHING
	`
	_, err = r.db.ExecContext(ctx, query,
		invoice.ID, invoice.CompanyID, nullIfEmpty(invoice.ClientID), invoice.InvoiceNumber, invoice.IssueDate,
		invoice.DueDate, invoice.Status, invoice.PaidAt, invoice.Currency,
		nullIfEmpty(invoice.Description), nullIfEmpty(invoice.TradeType), nullIfEmpty(invoice.PaymentMethod),
		vatRate, string(lineItemsJSON),
		invoice.SubtotalCents, invoice.VatAmountCents, invoice.TotalCents, invoice.CreatedAt,
	)
	return err
}

func (r *PostgresClientInvoiceRepository) UpdateInvoiceStatus(ctx context.Context, invoice *model.Invoice) error {
	query := `
		UPDATE company_invoices
		SET status = $3, due_date = $4, paid_at = $5, updated_at = NOW()
		WHERE company_id = $1 AND id = $2
	`
	res, err := r.db.ExecContext(ctx, query,
		invoice.CompanyID, invoice.ID, invoice.Status, invoice.DueDate, invoice.PaidAt,
	)
	if err != nil {
		return fmt.Errorf("update invoice: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrInvoiceNotFound
	}
	return nil
}

const invoiceColumns = `
	i.id, i.company_id, COALESCE(i.client_id, ''), COALESCE(c.name, ''),
	i.invoice_number, i.issue_date, i.due_date, i.status, i.paid_at, i.currency,
	COALESCE(i.description, ''), COALESCE(i.trade_type, ''), COALESCE(i.payment_method, ''),
	i.vat_rate::float8, i.line_items::text,
	i.subtotal_cents, i.vat_cents, i.total_cents, i.created_at
`

func scanInvoice(row rowScanner) (*model.Invoice, error) {
	var i model.Invoice
	var iDate, dDate, pDate sql.NullString
	var status, currency sql.NullString
	var lineItemsJSON string
	if err := row.Scan(
		&i.ID, &i.CompanyID, &i.ClientID, &i.ClientName,
		&i.InvoiceNumber, &iDate, &dDate, &status, &pDate, &currency,
		&i.Description, &i.TradeType, &i.PaymentMethod,
		&i.VatRate, &lineItemsJSON,
		&i.SubtotalCents, &i.VatAmountCents, &i.TotalCents, &i.CreatedAt,
	); err != nil {
		return nil, err
	}
	if iDate.Valid && len(iDate.String) >= 10 {
		i.IssueDate = iDate.String[:10]
	}
	if dDate.Valid && len(dDate.String) >= 10 {
		i.DueDate = dDate.String[:10]
	}
	if pDate.Valid && len(pDate.String) >= 10 {
		pStr := pDate.String[:10]
		i.PaidAt = &pStr
	}
	if status.Valid {
		i.Status = status.String
	} else {
		i.Status = model.InvoiceStatusSent
	}
	if currency.Valid {
		i.Currency = currency.String
	} else {
		i.Currency = "EUR"
	}
	if err := json.Unmarshal([]byte(lineItemsJSON), &i.LineItems); err != nil || i.LineItems == nil {
		i.LineItems = []model.InvoiceLineItem{}
	}
	return &i, nil
}

func (r *PostgresClientInvoiceRepository) ListInvoices(ctx context.Context, companyID string, clientID *string) ([]*model.Invoice, error) {
	query := `
		SELECT ` + invoiceColumns + `
		FROM company_invoices i
		LEFT JOIN clients c ON i.client_id = c.id
		WHERE i.company_id = $1
	`
	var args []interface{}
	args = append(args, companyID)
	if clientID != nil && *clientID != "" {
		args = append(args, *clientID)
		query += fmt.Sprintf(" AND i.client_id = $%d", len(args))
	}
	query += " ORDER BY i.issue_date DESC, i.created_at DESC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list invoices: %w", err)
	}
	defer rows.Close()

	invoices := []*model.Invoice{}
	for rows.Next() {
		inv, err := scanInvoice(rows)
		if err != nil {
			return nil, fmt.Errorf("scan invoice: %w", err)
		}
		invoices = append(invoices, inv)
	}
	return invoices, rows.Err()
}

func (r *PostgresClientInvoiceRepository) GetInvoiceByID(ctx context.Context, companyID, id string) (*model.Invoice, error) {
	query := `
		SELECT ` + invoiceColumns + `
		FROM company_invoices i
		LEFT JOIN clients c ON i.client_id = c.id
		WHERE i.company_id = $1 AND i.id = $2
	`
	inv, err := scanInvoice(r.db.QueryRowContext(ctx, query, companyID, id))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrInvoiceNotFound
		}
		return nil, err
	}
	return inv, nil
}

func (r *PostgresClientInvoiceRepository) GetMaxInvoiceNumber(ctx context.Context, companyID string) (int, error) {
	query := `
		SELECT COALESCE(MAX(
			NULLIF(regexp_replace(invoice_number, '\D', '', 'g'), '')::INT
		), 0)
		FROM company_invoices
		WHERE company_id = $1
	`
	var maxNum int
	err := r.db.QueryRowContext(ctx, query, companyID).Scan(&maxNum)
	return maxNum, err
}
