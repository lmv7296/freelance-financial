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

type PostgresTaxVaultRepository struct {
	db *sql.DB
}

func NewPostgresTaxVaultRepository(db *sql.DB) *PostgresTaxVaultRepository {
	return &PostgresTaxVaultRepository{db: db}
}

// Tax Rules
func (r *PostgresTaxVaultRepository) GetTaxRules(ctx context.Context, taxYear int, legalForm *string) ([]model.TaxRule, error) {
	query := `
		SELECT id, tax_year, jurisdiction, legal_form, key, label, value_type, value, conditions, source_url, verified_at, valid_from, valid_to
		FROM tax_rules
		WHERE tax_year = $1 AND (legal_form IS NULL OR $2::TEXT IS NULL OR legal_form = $2)
	`
	rows, err := r.db.QueryContext(ctx, query, taxYear, legalForm)
	if err != nil {
		return nil, fmt.Errorf("select tax_rules: %w", err)
	}
	defer rows.Close()

	var rules []model.TaxRule
	for rows.Next() {
		var tr model.TaxRule
		var valBytes, condBytes []byte
		var vf, vt sql.NullString
		var vAt time.Time
		err := rows.Scan(
			&tr.ID, &tr.TaxYear, &tr.Jurisdiction, &tr.LegalForm, &tr.Key, &tr.Label,
			&tr.ValueType, &valBytes, &condBytes, &tr.SourceURL, &vAt, &vf, &vt,
		)
		if err == nil {
			tr.Value = valBytes
			_ = json.Unmarshal(condBytes, &tr.Conditions)
			tr.VerifiedAt = vAt.Format("2006-01-02")
			if vf.Valid {
				tr.ValidFrom = &vf.String
			}
			if vt.Valid {
				tr.ValidTo = &vt.String
			}
			rules = append(rules, tr)
		}
	}
	return rules, nil
}

func (r *PostgresTaxVaultRepository) GetAvailableTaxYears(ctx context.Context) ([]int, error) {
	query := `SELECT DISTINCT tax_year FROM tax_rules ORDER BY tax_year DESC`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return []int{2026}, nil
	}
	defer rows.Close()

	var years []int
	for rows.Next() {
		var y int
		if err := rows.Scan(&y); err == nil {
			years = append(years, y)
		}
	}
	if len(years) == 0 {
		years = append(years, 2026)
	}
	return years, nil
}

func (r *PostgresTaxVaultRepository) SeedTaxRules(ctx context.Context, rules []model.TaxRule) error {
	for _, rule := range rules {
		condBytes, _ := json.Marshal(rule.Conditions)
		query := `
			INSERT INTO tax_rules (id, tax_year, jurisdiction, legal_form, key, label, value_type, value, conditions, source_url, verified_at, valid_from, valid_to)
			VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			ON CONFLICT (id) DO NOTHING
		`
		vAt, _ := time.Parse("2006-01-02", rule.VerifiedAt)
		_, _ = r.db.ExecContext(ctx, query,
			rule.TaxYear, rule.Jurisdiction, rule.LegalForm, rule.Key, rule.Label,
			rule.ValueType, rule.Value, condBytes, rule.SourceURL, vAt, rule.ValidFrom, rule.ValidTo,
		)
	}
	return nil
}

// Tax Profile
func (r *PostgresTaxVaultRepository) GetTaxProfile(ctx context.Context, companyID string) (*model.TaxProfile, error) {
	query := `
		SELECT COALESCE(c.legal_form, 'eenmanszaak'),
		       COALESCE(tp.vat_filing_frequency, 'quarter'),
		       COALESCE(tp.uses_kor, false),
		       tp.meets_hours_criterion,
		       COALESCE(tp.is_starter, false),
		       COALESCE(tp.reached_aow_age, false),
		       tp.other_box1_income_cents,
		       tp.provisional_assessment_monthly_cents,
		       tp.accountant_name,
		       tp.accountant_email,
		       COALESCE(tp.default_export_formats, '["xlsx", "receipts_zip"]'::jsonb),
		       COALESCE(tp.updated_at, c.updated_at)
		FROM companies c
		LEFT JOIN tax_profiles tp ON c.id = tp.company_id
		WHERE c.id = $1
	`
	var p model.TaxProfile
	var lf, freq string
	var otherCents, provCents sql.NullInt64
	var formatsBytes []byte
	var up time.Time

	err := r.db.QueryRowContext(ctx, query, companyID).Scan(
		&lf, &freq, &p.UsesKOR, &p.MeetsHoursCriterion, &p.IsStarter, &p.ReachedAOWAge,
		&otherCents, &provCents, &p.AccountantName, &p.AccountantEmail,
		&formatsBytes, &up,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			defaults := model.DefaultTaxProfile()
			_ = r.SaveTaxProfile(ctx, companyID, defaults)
			return &defaults, nil
		}
		return nil, fmt.Errorf("select tax_profile: %w", err)
	}

	p.LegalForm = model.LegalForm(lf)
	p.VatFilingFrequency = model.VatFilingFrequency(freq)
	if otherCents.Valid {
		amt := float64(otherCents.Int64) / 100.0
		p.OtherBox1Income = &amt
	}
	if provCents.Valid {
		amt := float64(provCents.Int64) / 100.0
		p.ProvisionalAssessmentMonthly = &amt
	}
	_ = json.Unmarshal(formatsBytes, &p.DefaultExportFormats)
	p.UpdatedAt = up.Format(time.RFC3339)

	return &p, nil
}

func (r *PostgresTaxVaultRepository) SaveTaxProfile(ctx context.Context, companyID string, profile model.TaxProfile) error {
	formatsBytes, _ := json.Marshal(profile.DefaultExportFormats)
	var otherCents, provCents *int64
	if profile.OtherBox1Income != nil {
		val := int64(*profile.OtherBox1Income * 100)
		otherCents = &val
	}
	if profile.ProvisionalAssessmentMonthly != nil {
		val := int64(*profile.ProvisionalAssessmentMonthly * 100)
		provCents = &val
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin save tax profile tx: %w", err)
	}
	defer tx.Rollback()

	now := time.Now().UTC()
	_, err = tx.ExecContext(ctx, `
		UPDATE companies
		SET legal_form = $1, updated_at = $2
		WHERE id = $3
	`, string(profile.LegalForm), now, companyID)
	if err != nil {
		return fmt.Errorf("update company legal_form: %w", err)
	}

	query := `
		INSERT INTO tax_profiles (
			company_id, vat_filing_frequency, uses_kor, meets_hours_criterion, is_starter, reached_aow_age,
			other_box1_income_cents, provisional_assessment_monthly_cents, accountant_name, accountant_email,
			default_export_formats, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		ON CONFLICT (company_id) DO UPDATE
		SET vat_filing_frequency = EXCLUDED.vat_filing_frequency,
		    uses_kor = EXCLUDED.uses_kor,
		    meets_hours_criterion = EXCLUDED.meets_hours_criterion,
		    is_starter = EXCLUDED.is_starter,
		    reached_aow_age = EXCLUDED.reached_aow_age,
		    other_box1_income_cents = EXCLUDED.other_box1_income_cents,
		    provisional_assessment_monthly_cents = EXCLUDED.provisional_assessment_monthly_cents,
		    accountant_name = EXCLUDED.accountant_name,
		    accountant_email = EXCLUDED.accountant_email,
		    default_export_formats = EXCLUDED.default_export_formats,
		    updated_at = EXCLUDED.updated_at
	`
	_, err = tx.ExecContext(ctx, query,
		companyID, string(profile.VatFilingFrequency), profile.UsesKOR,
		profile.MeetsHoursCriterion, profile.IsStarter, profile.ReachedAOWAge,
		otherCents, provCents, profile.AccountantName, profile.AccountantEmail,
		formatsBytes, now,
	)
	if err != nil {
		return fmt.Errorf("upsert tax_profiles: %w", err)
	}

	return tx.Commit()
}

// Tax Exports
func (r *PostgresTaxVaultRepository) GetTaxExports(ctx context.Context, companyID string, taxYear int) ([]model.TaxExport, error) {
	query := `
		SELECT id, tax_year, period_key, period_label, formats, status, download_url, sent_to, error, created_at
		FROM tax_exports
		WHERE company_id = $1 AND tax_year = $2
		ORDER BY created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, companyID, taxYear)
	if err != nil {
		return nil, fmt.Errorf("select tax_exports: %w", err)
	}
	defer rows.Close()

	var exports []model.TaxExport
	for rows.Next() {
		var exp model.TaxExport
		var formatsBytes []byte
		var cr time.Time
		err := rows.Scan(
			&exp.ID, &exp.TaxYear, &exp.PeriodKey, &exp.PeriodLabel, &formatsBytes,
			&exp.Status, &exp.DownloadURL, &exp.SentTo, &exp.Error, &cr,
		)
		if err == nil {
			_ = json.Unmarshal(formatsBytes, &exp.Formats)
			exp.CreatedAt = cr.Format(time.RFC3339)
			exports = append(exports, exp)
		}
	}
	if exports == nil {
		exports = []model.TaxExport{}
	}
	return exports, nil
}

func (r *PostgresTaxVaultRepository) CreateTaxExport(ctx context.Context, exp model.TaxExport, companyID string) error {
	formatsBytes, _ := json.Marshal(exp.Formats)
	query := `
		INSERT INTO tax_exports (id, company_id, tax_year, period_key, period_label, formats, status, download_url, sent_to, error, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	cr, _ := time.Parse(time.RFC3339, exp.CreatedAt)
	if cr.IsZero() {
		cr = time.Now().UTC()
	}
	_, err := r.db.ExecContext(ctx, query,
		exp.ID, companyID, exp.TaxYear, exp.PeriodKey, exp.PeriodLabel,
		formatsBytes, exp.Status, exp.DownloadURL, exp.SentTo, exp.Error, cr,
	)
	return err
}

func (r *PostgresTaxVaultRepository) UpdateTaxExport(ctx context.Context, exp model.TaxExport) error {
	query := `
		UPDATE tax_exports
		SET status = $1, download_url = $2, error = $3
		WHERE id = $4
	`
	_, err := r.db.ExecContext(ctx, query, exp.Status, exp.DownloadURL, exp.Error, exp.ID)
	return err
}

