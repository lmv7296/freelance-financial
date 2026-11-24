package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"go-freelancer/internal/model"
)

type PostgresCompanyRepository struct {
	db *sql.DB
}

func NewPostgresCompanyRepository(db *sql.DB) *PostgresCompanyRepository {
	return &PostgresCompanyRepository{db: db}
}

func (r *PostgresCompanyRepository) Create(ctx context.Context, company *model.Company) error {
	country := company.Country
	if country == "" {
		country = "NL"
	}
	query := `
		INSERT INTO companies (id, name, country, tax_regime, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO NOTHING
	`
	_, err := r.db.ExecContext(ctx, query,
		company.ID,
		company.Name,
		country,
		company.TaxRegime,
		company.CreatedAt,
		company.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert company: %w", err)
	}
	return nil
}

func (r *PostgresCompanyRepository) GetByID(ctx context.Context, id string) (*model.Company, error) {
	query := `
		SELECT id, name, trade_name, legal_form, tax_regime, vat_number, country, email, phone, website, iban, logo_path, created_at, updated_at
		FROM companies
		WHERE id = $1
	`
	var c model.Company
	var name, trade, legal, regime, vat, email, phone, website, iban, logo sql.NullString

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&c.ID,
		&name,
		&trade,
		&legal,
		&regime,
		&vat,
		&c.Country,
		&email,
		&phone,
		&website,
		&iban,
		&logo,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCompanyNotFound
		}
		return nil, fmt.Errorf("select company: %w", err)
	}

	if name.Valid {
		c.Name = &name.String
	}
	if trade.Valid {
		c.TradeName = &trade.String
	}
	if legal.Valid {
		c.LegalForm = &legal.String
	}
	if regime.Valid {
		c.TaxRegime = &regime.String
	}
	if vat.Valid {
		c.VATNumber = &vat.String
	}
	if email.Valid {
		c.Email = &email.String
	}
	if phone.Valid {
		c.Phone = &phone.String
	}
	if website.Valid {
		c.Website = &website.String
	}
	if iban.Valid {
		c.IBAN = &iban.String
	}
	if logo.Valid {
		c.LogoPath = &logo.String
	}

	return &c, nil
}

func (r *PostgresCompanyRepository) Update(ctx context.Context, company *model.Company) error {
	query := `
		UPDATE companies
		SET name = $1, trade_name = $2, legal_form = $3, tax_regime = $4,
		    started_on = $5, kvk_number = $6, kvk_branch_number = $7,
		    vat_number = $8, rsin = $9, street = $10, postal_code = $11,
		    city = $12, country = $13, email = $14, phone = $15,
		    website = $16, iban = $17, iban_holder_name = $18, logo_path = $19,
		    updated_at = $20
		WHERE id = $21
	`
	_, err := r.db.ExecContext(ctx, query,
		company.Name, company.TradeName, company.LegalForm, company.TaxRegime,
		company.StartedOn, company.KVKNumber, company.KVKBranchNumber,
		company.VATNumber, company.RSIN, company.Street, company.PostalCode,
		company.City, company.Country, company.Email, company.Phone,
		company.Website, company.IBAN, company.IBANHolderName, company.LogoPath,
		company.UpdatedAt, company.ID,
	)
	return err
}
