package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"go-freelancer/internal/model"
)

type PostgresExpenseRepository struct {
	db        *sql.DB
	uploadDir string
}

func NewPostgresExpenseRepository(db *sql.DB, uploadDir string) *PostgresExpenseRepository {
	if uploadDir == "" {
		uploadDir = "./uploads/receipts"
	}
	return &PostgresExpenseRepository{db: db, uploadDir: uploadDir}
}

func (r *PostgresExpenseRepository) Create(ctx context.Context, exp *model.Expense) error {
	vatLinesBytes, _ := json.Marshal(exp.VatLines)
	lineItemsBytes, _ := json.Marshal(exp.LineItems)

	subtotalCents := int64(0)
	if exp.SubtotalAmount != nil {
		subtotalCents = int64(*exp.SubtotalAmount * 100)
	}
	vatCents := int64(0)
	if exp.VatAmount != nil {
		vatCents = int64(*exp.VatAmount * 100)
	}
	totalCents := int64(exp.TotalAmount * 100)

	query := `
		INSERT INTO company_expenses (
			id, company_id, status, source, sender_name, sender_phone, merchant_name, merchant_address,
			receipt_date, payment_method, category, currency, subtotal_cents, vat_cents, total_cents,
			vat_lines, line_items, receipt_url, receipt_content_type, receipt_file_path,
			extraction_confidence, client_id, invoice_id, notes, rejection_reason, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, $14, $15,
			$16, $17, $18, $19, $20,
			$21, $22, $23, $24, $25, $26, $27
		)
	`
	_, err := r.db.ExecContext(ctx, query,
		exp.ID, exp.CompanyID, string(exp.Status), exp.Source, exp.SenderName, exp.SenderPhone, exp.MerchantName, exp.MerchantAddress,
		exp.ReceiptDate, exp.PaymentMethod, exp.Category, exp.Currency, subtotalCents, vatCents, totalCents,
		vatLinesBytes, lineItemsBytes, exp.ReceiptURL, exp.ReceiptContentType, exp.ReceiptFilePath,
		exp.ExtractionConfidence, exp.ClientID, exp.InvoiceID, exp.Notes, exp.RejectionReason, exp.CreatedAt, exp.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert expense: %w", err)
	}
	return nil
}

func (r *PostgresExpenseRepository) GetByID(ctx context.Context, companyID, id string) (*model.Expense, error) {
	query := `
		SELECT e.id, e.company_id, e.status, e.source, e.sender_name, e.sender_phone, e.merchant_name, e.merchant_address,
		       e.receipt_date, e.payment_method, e.category, e.currency, e.subtotal_cents, e.vat_cents, e.total_cents,
		       e.vat_lines, e.line_items, e.receipt_url, e.receipt_content_type, e.receipt_file_path,
		       e.extraction_confidence, e.client_id, e.invoice_id, e.notes, e.rejection_reason, e.created_at, e.updated_at,
		       c.name, i.invoice_number
		FROM company_expenses e
		LEFT JOIN clients c ON e.client_id = c.id
		LEFT JOIN company_invoices i ON e.invoice_id = i.id
		WHERE e.company_id = $1 AND e.id = $2
	`
	row := r.db.QueryRowContext(ctx, query, companyID, id)
	return scanExpenseRow(row)
}

func (r *PostgresExpenseRepository) List(ctx context.Context, companyID string, status *string, search *string) ([]*model.Expense, error) {
	query := `
		SELECT e.id, e.company_id, e.status, e.source, e.sender_name, e.sender_phone, e.merchant_name, e.merchant_address,
		       e.receipt_date, e.payment_method, e.category, e.currency, e.subtotal_cents, e.vat_cents, e.total_cents,
		       e.vat_lines, e.line_items, e.receipt_url, e.receipt_content_type, e.receipt_file_path,
		       e.extraction_confidence, e.client_id, e.invoice_id, e.notes, e.rejection_reason, e.created_at, e.updated_at,
		       c.name, i.invoice_number
		FROM company_expenses e
		LEFT JOIN clients c ON e.client_id = c.id
		LEFT JOIN company_invoices i ON e.invoice_id = i.id
		WHERE e.company_id = $1
	`
	var args []interface{}
	args = append(args, companyID)

	if status != nil && *status != "" {
		args = append(args, *status)
		query += fmt.Sprintf(" AND e.status = $%d", len(args))
	}
	if search != nil && *search != "" {
		args = append(args, "%"+*search+"%")
		query += fmt.Sprintf(" AND (e.merchant_name ILIKE $%d OR e.notes ILIKE $%d)", len(args), len(args))
	}
	query += " ORDER BY e.created_at DESC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list expenses: %w", err)
	}
	defer rows.Close()

	var expenses []*model.Expense
	for rows.Next() {
		exp, err := scanExpenseRows(rows)
		if err == nil {
			expenses = append(expenses, exp)
		}
	}
	if expenses == nil {
		expenses = []*model.Expense{}
	}
	return expenses, nil
}

func (r *PostgresExpenseRepository) Update(ctx context.Context, exp *model.Expense) error {
	vatLinesBytes, _ := json.Marshal(exp.VatLines)
	lineItemsBytes, _ := json.Marshal(exp.LineItems)

	subtotalCents := int64(0)
	if exp.SubtotalAmount != nil {
		subtotalCents = int64(*exp.SubtotalAmount * 100)
	}
	vatCents := int64(0)
	if exp.VatAmount != nil {
		vatCents = int64(*exp.VatAmount * 100)
	}
	totalCents := int64(exp.TotalAmount * 100)

	query := `
		UPDATE company_expenses SET
			status = $1, merchant_name = $2, merchant_address = $3, receipt_date = $4,
			payment_method = $5, category = $6, subtotal_cents = $7, vat_cents = $8, total_cents = $9,
			vat_lines = $10, line_items = $11, receipt_url = $12, receipt_content_type = $13,
			client_id = $14, invoice_id = $15, notes = $16, rejection_reason = $17, updated_at = $18
		WHERE company_id = $19 AND id = $20
	`
	res, err := r.db.ExecContext(ctx, query,
		string(exp.Status), exp.MerchantName, exp.MerchantAddress, exp.ReceiptDate,
		exp.PaymentMethod, exp.Category, subtotalCents, vatCents, totalCents,
		vatLinesBytes, lineItemsBytes, exp.ReceiptURL, exp.ReceiptContentType,
		exp.ClientID, exp.InvoiceID, exp.Notes, exp.RejectionReason, time.Now().UTC(),
		exp.CompanyID, exp.ID,
	)
	if err != nil {
		return fmt.Errorf("update expense: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrExpenseNotFound
	}
	return nil
}

func (r *PostgresExpenseRepository) Delete(ctx context.Context, companyID, id string) error {
	query := `DELETE FROM company_expenses WHERE company_id = $1 AND id = $2`
	res, err := r.db.ExecContext(ctx, query, companyID, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrExpenseNotFound
	}
	return nil
}

func (r *PostgresExpenseRepository) SaveReceiptFile(companyID, fileID, ext string, data []byte) (string, error) {
	dir := filepath.Join(r.uploadDir, companyID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("create receipt dir: %w", err)
	}
	filePath := filepath.Join(dir, fileID+ext)
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return "", fmt.Errorf("write receipt file: %w", err)
	}
	return filePath, nil
}

func (r *PostgresExpenseRepository) GetReceiptFile(companyID, fileID string) (filePath string, contentType string, err error) {
	query := `
		SELECT receipt_file_path, receipt_content_type
		FROM company_expenses
		WHERE company_id = $1 AND (receipt_url LIKE '%' || $2 || '%' OR id = $2)
		LIMIT 1
	`
	var fp sql.NullString
	var ct sql.NullString
	err = r.db.QueryRow(query, companyID, fileID).Scan(&fp, &ct)
	if err != nil || !fp.Valid || fp.String == "" {
		// Fallback check directory
		pattern := filepath.Join(r.uploadDir, companyID, fileID+".*")
		matches, _ := filepath.Glob(pattern)
		if len(matches) > 0 {
			return matches[0], "image/jpeg", nil
		}
		return "", "", ErrFileNotFound
	}
	return fp.String, ct.String, nil
}

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanExpense(s rowScanner) (*model.Expense, error) {
	var e model.Expense
	var statusStr string
	var subtotalCents, vatCents sql.NullInt64
	var totalCents int64
	var vatLinesBytes, lineItemsBytes []byte
	var clientName, invoiceNum sql.NullString
	var rDate sql.NullString

	err := s.Scan(
		&e.ID, &e.CompanyID, &statusStr, &e.Source, &e.SenderName, &e.SenderPhone,
		&e.MerchantName, &e.MerchantAddress, &rDate, &e.PaymentMethod, &e.Category,
		&e.Currency, &subtotalCents, &vatCents, &totalCents, &vatLinesBytes, &lineItemsBytes,
		&e.ReceiptURL, &e.ReceiptContentType, &e.ReceiptFilePath, &e.ExtractionConfidence,
		&e.ClientID, &e.InvoiceID, &e.Notes, &e.RejectionReason, &e.CreatedAt, &e.UpdatedAt,
		&clientName, &invoiceNum,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrExpenseNotFound
		}
		return nil, err
	}

	e.Status = model.ExpenseStatus(statusStr)
	if rDate.Valid {
		dateStr := rDate.String
		if len(dateStr) >= 10 {
			dateStr = dateStr[:10]
		}
		e.ReceiptDate = &dateStr
	}
	if subtotalCents.Valid {
		amt := float64(subtotalCents.Int64) / 100.0
		e.SubtotalAmount = &amt
	}
	if vatCents.Valid {
		amt := float64(vatCents.Int64) / 100.0
		e.VatAmount = &amt
	}
	e.TotalAmount = float64(totalCents) / 100.0

	_ = json.Unmarshal(vatLinesBytes, &e.VatLines)
	_ = json.Unmarshal(lineItemsBytes, &e.LineItems)

	if clientName.Valid {
		e.ClientName = &clientName.String
	}
	if invoiceNum.Valid {
		e.InvoiceNumber = &invoiceNum.String
	}

	return &e, nil
}

func scanExpenseRow(r *sql.Row) (*model.Expense, error) {
	return scanExpense(r)
}

func scanExpenseRows(r *sql.Rows) (*model.Expense, error) {
	return scanExpense(r)
}

