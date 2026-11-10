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

type PostgresSettingsRepository struct {
	db      *sql.DB
	logoDir string
}

func NewPostgresSettingsRepository(db *sql.DB, logoDir string) *PostgresSettingsRepository {
	if logoDir == "" {
		logoDir = "./uploads/logos"
	}
	return &PostgresSettingsRepository{db: db, logoDir: logoDir}
}

// Lists
func (r *PostgresSettingsRepository) GetLists(ctx context.Context, companyID string) (*model.CompanyLists, error) {
	query := `
		SELECT merchants, categories, payment_methods
		FROM company_lists
		WHERE company_id = $1
	`
	var mBytes, cBytes, pBytes []byte
	err := r.db.QueryRowContext(ctx, query, companyID).Scan(&mBytes, &cBytes, &pBytes)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			defaults := model.DefaultCompanyLists()
			_ = r.SaveLists(ctx, companyID, &defaults)
			return &defaults, nil
		}
		return nil, fmt.Errorf("select company_lists: %w", err)
	}

	var lists model.CompanyLists
	_ = json.Unmarshal(mBytes, &lists.Merchants)
	_ = json.Unmarshal(cBytes, &lists.Categories)
	_ = json.Unmarshal(pBytes, &lists.PaymentMethods)
	return &lists, nil
}

func (r *PostgresSettingsRepository) SaveLists(ctx context.Context, companyID string, lists *model.CompanyLists) error {
	mBytes, _ := json.Marshal(lists.Merchants)
	cBytes, _ := json.Marshal(lists.Categories)
	pBytes, _ := json.Marshal(lists.PaymentMethods)

	query := `
		INSERT INTO company_lists (company_id, merchants, categories, payment_methods, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (company_id) DO UPDATE
		SET merchants = EXCLUDED.merchants,
		    categories = EXCLUDED.categories,
		    payment_methods = EXCLUDED.payment_methods,
		    updated_at = EXCLUDED.updated_at
	`
	_, err := r.db.ExecContext(ctx, query, companyID, mBytes, cBytes, pBytes, time.Now().UTC())
	return err
}

// Company Settings
func (r *PostgresSettingsRepository) GetCompanySettings(ctx context.Context, companyID string) (*model.CompanySettings, error) {
	query := `
		SELECT name, trade_name, kvk_number, vat_number, street, postal_code, city, country, email, phone, website, iban, logo_path, updated_at
		FROM companies
		WHERE id = $1
	`
	var s model.CompanySettings
	var name, trade, kvk, vat, street, postal, city, country, email, phone, website, iban, logo sql.NullString
	var up time.Time

	err := r.db.QueryRowContext(ctx, query, companyID).Scan(
		&name, &trade, &kvk, &vat,
		&street, &postal, &city, &country,
		&email, &phone, &website, &iban, &logo,
		&up,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			nl := "NL"
			return &model.CompanySettings{
				Country:   &nl,
				UpdatedAt: time.Now().UTC().Format(time.RFC3339),
			}, nil
		}
		return nil, fmt.Errorf("select company for settings: %w", err)
	}

	if name.Valid {
		s.CompanyName = &name.String
	}
	if trade.Valid {
		s.TradeName = &trade.String
	}
	if kvk.Valid {
		s.KVKNumber = &kvk.String
	}
	if vat.Valid {
		s.VATNumber = &vat.String
	}
	if street.Valid {
		s.Street = &street.String
	}
	if postal.Valid {
		s.PostalCode = &postal.String
	}
	if city.Valid {
		s.City = &city.String
	}
	if country.Valid {
		s.Country = &country.String
	}
	if email.Valid {
		s.Email = &email.String
	}
	if phone.Valid {
		s.Phone = &phone.String
	}
	if website.Valid {
		s.Website = &website.String
	}
	if iban.Valid {
		s.IBAN = &iban.String
	}
	if logo.Valid && logo.String != "" {
		logoURL := "/api/v1/settings/company/logo"
		s.LogoURL = &logoURL
	}
	s.UpdatedAt = up.Format(time.RFC3339)
	return &s, nil
}

func (r *PostgresSettingsRepository) UpdateCompanySettings(ctx context.Context, companyID string, settings *model.CompanySettings) error {
	query := `
		UPDATE companies
		SET name = COALESCE($1, name),
		    trade_name = COALESCE($2, trade_name),
		    kvk_number = COALESCE($3, kvk_number),
		    vat_number = COALESCE($4, vat_number),
		    street = COALESCE($5, street),
		    postal_code = COALESCE($6, postal_code),
		    city = COALESCE($7, city),
		    country = COALESCE($8, country),
		    email = COALESCE($9, email),
		    phone = COALESCE($10, phone),
		    website = COALESCE($11, website),
		    iban = COALESCE($12, iban),
		    updated_at = $13
		WHERE id = $14
	`
	_, err := r.db.ExecContext(ctx, query,
		settings.CompanyName,
		settings.TradeName,
		settings.KVKNumber,
		settings.VATNumber,
		settings.Street,
		settings.PostalCode,
		settings.City,
		settings.Country,
		settings.Email,
		settings.Phone,
		settings.Website,
		settings.IBAN,
		time.Now().UTC(),
		companyID,
	)
	return err
}

func (r *PostgresSettingsRepository) SaveLogo(companyID, ext string, data []byte) (string, error) {
	dir := filepath.Join(r.logoDir, companyID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("create logo dir: %w", err)
	}
	_ = os.RemoveAll(dir)
	_ = os.MkdirAll(dir, 0755)

	filePath := filepath.Join(dir, "logo"+ext)
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return "", fmt.Errorf("write logo: %w", err)
	}

	query := `
		UPDATE companies
		SET logo_path = $1, updated_at = $2
		WHERE id = $3
	`
	_, err := r.db.Exec(query, filePath, time.Now().UTC(), companyID)
	if err != nil {
		return "", err
	}
	return "/api/v1/settings/company/logo", nil
}

func (r *PostgresSettingsRepository) DeleteLogo(companyID string) error {
	dir := filepath.Join(r.logoDir, companyID)
	_ = os.RemoveAll(dir)

	query := `
		UPDATE companies
		SET logo_path = NULL, updated_at = $2
		WHERE id = $1
	`
	_, err := r.db.Exec(query, companyID, time.Now().UTC())
	return err
}

// Invoice Defaults
func (r *PostgresSettingsRepository) GetInvoiceDefaults(ctx context.Context, companyID string) (*model.InvoiceDefaults, error) {
	query := `
		SELECT payment_term_days, number_prefix, next_number, number_padding, default_vat_rate, default_payment_method, footer_text, updated_at
		FROM invoice_defaults
		WHERE company_id = $1
	`
	var d model.InvoiceDefaults
	var up time.Time
	err := r.db.QueryRowContext(ctx, query, companyID).Scan(
		&d.PaymentTermDays, &d.NumberPrefix, &d.NextNumber, &d.NumberPadding,
		&d.DefaultVatRate, &d.DefaultPaymentMethod, &d.FooterText, &up,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			defaults := model.DefaultInvoiceDefaults()
			_ = r.UpdateInvoiceDefaults(ctx, companyID, &defaults)
			return &defaults, nil
		}
		return nil, fmt.Errorf("select invoice_defaults: %w", err)
	}
	d.UpdatedAt = up.Format(time.RFC3339)
	return &d, nil
}

func (r *PostgresSettingsRepository) UpdateInvoiceDefaults(ctx context.Context, companyID string, defaults *model.InvoiceDefaults) error {
	query := `
		INSERT INTO invoice_defaults (company_id, payment_term_days, number_prefix, next_number, number_padding, default_vat_rate, default_payment_method, footer_text, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (company_id) DO UPDATE
		SET payment_term_days = EXCLUDED.payment_term_days,
		    number_prefix = EXCLUDED.number_prefix,
		    next_number = EXCLUDED.next_number,
		    number_padding = EXCLUDED.number_padding,
		    default_vat_rate = EXCLUDED.default_vat_rate,
		    default_payment_method = EXCLUDED.default_payment_method,
		    footer_text = EXCLUDED.footer_text,
		    updated_at = EXCLUDED.updated_at
	`
	_, err := r.db.ExecContext(ctx, query,
		companyID,
		defaults.PaymentTermDays,
		defaults.NumberPrefix,
		defaults.NextNumber,
		defaults.NumberPadding,
		defaults.DefaultVatRate,
		defaults.DefaultPaymentMethod,
		defaults.FooterText,
		time.Now().UTC(),
	)
	return err
}

// WhatsApp Senders
func (r *PostgresSettingsRepository) GetWhatsAppSettings(ctx context.Context, companyID string) (*model.WhatsAppSettings, error) {
	query := `
		SELECT id, name, phone, active, receipts_count, created_at
		FROM whatsapp_senders
		WHERE company_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, companyID)
	if err != nil {
		return nil, fmt.Errorf("select whatsapp_senders: %w", err)
	}
	defer rows.Close()

	var senders []model.WhatsAppSender
	for rows.Next() {
		var s model.WhatsAppSender
		var cr time.Time
		if err := rows.Scan(&s.ID, &s.Name, &s.Phone, &s.Active, &s.ReceiptsCount, &cr); err == nil {
			s.CreatedAt = cr.Format(time.RFC3339)
			senders = append(senders, s)
		}
	}

	if senders == nil {
		senders = []model.WhatsAppSender{}
	}

	recNumber := "+31850012345"
	return &model.WhatsAppSettings{
		ReceivingNumber: &recNumber,
		Senders:         senders,
	}, nil
}

func (r *PostgresSettingsRepository) CreateWhatsAppSender(ctx context.Context, companyID string, sender *model.WhatsAppSender) error {
	query := `
		INSERT INTO whatsapp_senders (id, company_id, name, phone, active, receipts_count, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.ExecContext(ctx, query,
		sender.ID,
		companyID,
		sender.Name,
		sender.Phone,
		sender.Active,
		sender.ReceiptsCount,
		time.Now().UTC(),
	)
	if err != nil {
		if isUniqueViolation(err) {
			return ErrDuplicatePhone
		}
		return fmt.Errorf("insert whatsapp_sender: %w", err)
	}
	return nil
}

func (r *PostgresSettingsRepository) UpdateWhatsAppSender(ctx context.Context, companyID, id string, name *string, active *bool) (*model.WhatsAppSender, error) {
	query := `
		UPDATE whatsapp_senders
		SET name = COALESCE($1, name),
		    active = COALESCE($2, active)
		WHERE company_id = $3 AND id = $4
		RETURNING id, name, phone, active, receipts_count, created_at
	`
	var s model.WhatsAppSender
	var cr time.Time
	err := r.db.QueryRowContext(ctx, query, name, active, companyID, id).Scan(
		&s.ID, &s.Name, &s.Phone, &s.Active, &s.ReceiptsCount, &cr,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSenderNotFound
		}
		return nil, fmt.Errorf("update whatsapp_sender: %w", err)
	}
	s.CreatedAt = cr.Format(time.RFC3339)
	return &s, nil
}

func (r *PostgresSettingsRepository) DeleteWhatsAppSender(ctx context.Context, companyID, id string) error {
	query := `DELETE FROM whatsapp_senders WHERE company_id = $1 AND id = $2`
	res, err := r.db.ExecContext(ctx, query, companyID, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrSenderNotFound
	}
	return nil
}

func (r *PostgresSettingsRepository) FindSenderByPhone(ctx context.Context, phone string) (string, *model.WhatsAppSender, error) {
	query := `
		SELECT company_id, id, name, phone, active, receipts_count, created_at
		FROM whatsapp_senders
		WHERE phone = $1
		LIMIT 1
	`
	var companyID string
	var s model.WhatsAppSender
	var cr time.Time
	err := r.db.QueryRowContext(ctx, query, phone).Scan(
		&companyID, &s.ID, &s.Name, &s.Phone, &s.Active, &s.ReceiptsCount, &cr,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil, nil
		}
		return "", nil, fmt.Errorf("select sender by phone: %w", err)
	}
	s.CreatedAt = cr.Format(time.RFC3339)
	return companyID, &s, nil
}

func (r *PostgresSettingsRepository) UpdateSenderReceiptsCount(ctx context.Context, companyID, senderID string, count int) error {
	query := `UPDATE whatsapp_senders SET receipts_count = $1 WHERE company_id = $2 AND id = $3`
	_, err := r.db.ExecContext(ctx, query, count, companyID, senderID)
	return err
}

// User Preferences
func (r *PostgresSettingsRepository) GetUserPreferences(ctx context.Context, userID string) (*model.UserPreferences, error) {
	query := `
		SELECT language, theme, notifications, updated_at
		FROM user_preferences
		WHERE user_id = $1
	`
	var p model.UserPreferences
	var notifBytes []byte
	var up time.Time
	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&p.Language, &p.Theme, &notifBytes, &up,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			defaults := model.DefaultUserPreferences()
			_ = r.UpdateUserPreferences(ctx, userID, &defaults)
			return &defaults, nil
		}
		return nil, fmt.Errorf("select user_preferences: %w", err)
	}
	p.UpdatedAt = up.Format(time.RFC3339)
	_ = json.Unmarshal(notifBytes, &p.Notifications)
	return &p, nil
}

func (r *PostgresSettingsRepository) UpdateUserPreferences(ctx context.Context, userID string, prefs *model.UserPreferences) error {
	notifBytes, _ := json.Marshal(prefs.Notifications)
	query := `
		INSERT INTO user_preferences (user_id, language, theme, notifications, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id) DO UPDATE
		SET language = EXCLUDED.language,
		    theme = EXCLUDED.theme,
		    notifications = EXCLUDED.notifications,
		    updated_at = EXCLUDED.updated_at
	`
	_, err := r.db.ExecContext(ctx, query,
		userID,
		prefs.Language,
		prefs.Theme,
		notifBytes,
		time.Now().UTC(),
	)
	return err
}

