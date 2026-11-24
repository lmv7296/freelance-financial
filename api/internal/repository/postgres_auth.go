package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"go-freelancer/internal/model"
)

type PostgresUserRepository struct {
	db *sql.DB
}

func NewPostgresUserRepository(db *sql.DB) *PostgresUserRepository {
	return &PostgresUserRepository{db: db}
}

func (r *PostgresUserRepository) Create(ctx context.Context, user *model.User) error {
	role := user.Role
	if role == "" {
		role = "owner"
	}
	query := `
		INSERT INTO users (id, company_id, email, password_hash, is_verified, role, created_at, updated_at)
		VALUES ($1, $2, $3, $4, false, $5, $6, $7)
	`
	_, err := r.db.ExecContext(ctx, query,
		user.ID,
		user.CompanyID,
		user.Email,
		user.PasswordHash,
		role,
		user.CreatedAt,
		user.UpdatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return ErrEmailAlreadyExists
		}
		return fmt.Errorf("insert user: %w", err)
	}
	return nil
}

func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `
		SELECT u.id, u.email, u.full_name, u.phone_number,
		       c.country, c.name, c.vat_number, c.legal_form, c.tax_regime,
		       u.is_verified, COALESCE(u.company_id, ''), COALESCE(u.role, 'owner'), u.created_at, u.updated_at,
		       COALESCE(u.password_hash, '')
		FROM users u
		LEFT JOIN companies c ON u.company_id = c.id
		WHERE LOWER(u.email) = LOWER($1)
	`
	return scanUser(r.db.QueryRowContext(ctx, query, email))
}

func (r *PostgresUserRepository) GetByID(ctx context.Context, id string) (*model.User, error) {
	query := `
		SELECT u.id, u.email, u.full_name, u.phone_number,
		       c.country, c.name, c.vat_number, c.legal_form, c.tax_regime,
		       u.is_verified, COALESCE(u.company_id, ''), COALESCE(u.role, 'owner'), u.created_at, u.updated_at,
		       COALESCE(u.password_hash, '')
		FROM users u
		LEFT JOIN companies c ON u.company_id = c.id
		WHERE u.id = $1
	`
	return scanUser(r.db.QueryRowContext(ctx, query, id))
}

func (r *PostgresUserRepository) UpdateEmail(ctx context.Context, userID, newEmail string) error {
	query := `
		UPDATE users
		SET email = $1, is_verified = false, updated_at = $2
		WHERE id = $3
	`
	_, err := r.db.ExecContext(ctx, query, newEmail, time.Now().UTC(), userID)
	if err != nil {
		if isUniqueViolation(err) {
			return ErrEmailAlreadyExists
		}
		return fmt.Errorf("update user email: %w", err)
	}
	return nil
}

func (r *PostgresUserRepository) UpdatePassword(ctx context.Context, userID, newPasswordHash string) error {
	query := `
		UPDATE users
		SET password_hash = $1, updated_at = $2
		WHERE id = $3
	`
	_, err := r.db.ExecContext(ctx, query, newPasswordHash, time.Now().UTC(), userID)
	if err != nil {
		return fmt.Errorf("update user password: %w", err)
	}
	return nil
}

func (r *PostgresUserRepository) UpdateProfile(ctx context.Context, userID string, req *model.UpdateProfileRequest) (*model.User, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	// 1. Fetch user to obtain company_id
	var companyID, role string
	err = tx.QueryRowContext(ctx, "SELECT COALESCE(company_id, ''), COALESCE(role, 'owner') FROM users WHERE id = $1 FOR UPDATE", userID).Scan(&companyID, &role)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("select user: %w", err)
	}

	now := time.Now().UTC()

	// 2. Update users table personal fields (full_name, phone_number)
	if req.FullName != nil || req.PhoneNumber != nil {
		_, err = tx.ExecContext(ctx, `
			UPDATE users
			SET full_name = COALESCE($1, full_name),
			    phone_number = COALESCE($2, phone_number),
			    updated_at = $3
			WHERE id = $4
		`, req.FullName, req.PhoneNumber, now, userID)
		if err != nil {
			return nil, fmt.Errorf("update user personal fields: %w", err)
		}
	}

	// 3. Update companies table business fields (name, legal_form, vat_number, country, tax_regime)
	if companyID != "" {
		hasName := req.BusinessName != nil
		var nameVal *string
		if hasName {
			nameVal = req.BusinessName
		}

		legalForm := req.LegalForm
		if legalForm == nil && req.TaxRegime != nil {
			legalForm = req.TaxRegime
		}
		hasLegal := legalForm != nil
		var legalVal *string
		if hasLegal {
			s := string(*legalForm)
			legalVal = &s
		}

		hasVat := req.VATNumber != nil
		var vatVal *string
		if hasVat {
			vatVal = req.VATNumber
		}

		hasCountry := req.Country != nil
		var countryVal *string
		var taxRegimeVal *string
		if hasCountry {
			countryVal = req.Country
			reg := taxRegimeForCountryHelper(*req.Country)
			taxRegimeVal = &reg
		}

		if hasName || hasLegal || hasVat || hasCountry {
			_, err = tx.ExecContext(ctx, `
				UPDATE companies
				SET name = CASE WHEN $1::BOOLEAN THEN $2 ELSE name END,
				    legal_form = CASE WHEN $3::BOOLEAN THEN $4 ELSE legal_form END,
				    vat_number = CASE WHEN $5::BOOLEAN THEN $6 ELSE vat_number END,
				    country = CASE WHEN $7::BOOLEAN THEN $8 ELSE country END,
				    tax_regime = CASE WHEN $7::BOOLEAN THEN $9 ELSE tax_regime END,
				    updated_at = $10
				WHERE id = $11
			`, hasName, nameVal, hasLegal, legalVal, hasVat, vatVal, hasCountry, countryVal, taxRegimeVal, now, companyID)
			if err != nil {
				return nil, fmt.Errorf("update company fields: %w", err)
			}
		}
	}

	// 4. Query updated unified user from companies join
	query := `
		SELECT u.id, u.email, u.full_name, u.phone_number,
		       c.country, c.name, c.vat_number, c.legal_form, c.tax_regime,
		       u.is_verified, COALESCE(u.company_id, ''), COALESCE(u.role, 'owner'), u.created_at, u.updated_at,
		       COALESCE(u.password_hash, '')
		FROM users u
		LEFT JOIN companies c ON u.company_id = c.id
		WHERE u.id = $1
	`
	updated, err := scanUser(tx.QueryRowContext(ctx, query, userID))
	if err != nil {
		return nil, fmt.Errorf("scan updated user: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return updated, nil
}

func taxRegimeForCountryHelper(country string) string {
	switch strings.ToUpper(strings.TrimSpace(country)) {
	case "NL", "":
		return "NL_BTW_STANDARD"
	case "BE":
		return "BE_TVA_STANDARD"
	case "DE":
		return "DE_MWST_STANDARD"
	case "ES":
		return "ES_AUTONOMO_GENERAL"
	default:
		return strings.ToUpper(strings.TrimSpace(country)) + "_STANDARD"
	}
}

func (r *PostgresUserRepository) SetVerified(ctx context.Context, userID string, isVerified bool) error {
	query := `
		UPDATE users
		SET is_verified = $1, updated_at = $2
		WHERE id = $3
	`
	_, err := r.db.ExecContext(ctx, query, isVerified, time.Now().UTC(), userID)
	return err
}

func (r *PostgresUserRepository) SaveVerificationToken(ctx context.Context, token *model.EmailVerificationToken) error {
	query := `
		INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4)
		ON CONFLICT (user_id) DO UPDATE
		SET token_hash = EXCLUDED.token_hash,
		    expires_at = EXCLUDED.expires_at,
		    created_at = EXCLUDED.created_at
	`
	_, err := r.db.ExecContext(ctx, query, token.UserID, token.TokenHash, token.ExpiresAt, token.CreatedAt)
	return err
}

func (r *PostgresUserRepository) GetVerificationTokenByHash(ctx context.Context, tokenHash string) (*model.EmailVerificationToken, error) {
	query := `
		SELECT id, user_id, token_hash, expires_at, created_at
		FROM email_verification_tokens
		WHERE token_hash = $1
	`
	var t model.EmailVerificationToken
	err := r.db.QueryRowContext(ctx, query, tokenHash).Scan(&t.ID, &t.UserID, &t.TokenHash, &t.ExpiresAt, &t.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrVerificationTokenInvalid
		}
		return nil, err
	}
	if time.Now().UTC().After(t.ExpiresAt) {
		return nil, ErrVerificationTokenInvalid
	}
	return &t, nil
}

func (r *PostgresUserRepository) DeleteVerificationToken(ctx context.Context, tokenHash string) error {
	query := `DELETE FROM email_verification_tokens WHERE token_hash = $1`
	_, err := r.db.ExecContext(ctx, query, tokenHash)
	return err
}

func (r *PostgresUserRepository) GetLatestTokenTimeByUserID(ctx context.Context, userID string) (*time.Time, error) {
	query := `
		SELECT created_at
		FROM email_verification_tokens
		WHERE user_id = $1
	`
	var cr time.Time
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&cr)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &cr, nil
}

func scanUser(scanner rowScanner) (*model.User, error) {
	var u model.User
	var fn, ph, co, bn, vn, lf, tr sql.NullString
	var cid sql.NullString
	var role string

	err := scanner.Scan(
		&u.ID,
		&u.Email,
		&fn,
		&ph,
		&co,
		&bn,
		&vn,
		&lf,
		&tr,
		&u.IsVerified,
		&cid,
		&role,
		&u.CreatedAt,
		&u.UpdatedAt,
		&u.PasswordHash,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("scan user: %w", err)
	}

	u.Role = role
	if u.Role == "" {
		u.Role = "owner"
	}

	if fn.Valid && fn.String != "" {
		u.FullName = &fn.String
	}
	if ph.Valid && ph.String != "" {
		u.PhoneNumber = &ph.String
	}
	if co.Valid && co.String != "" {
		u.Country = &co.String
	}
	if bn.Valid && bn.String != "" {
		u.BusinessName = &bn.String
	}
	if vn.Valid && vn.String != "" {
		u.VATNumber = &vn.String
	}
	if lf.Valid && lf.String != "" {
		legal := model.LegalForm(lf.String)
		u.LegalForm = &legal
	}
	if tr.Valid && tr.String != "" {
		u.TaxRegime = &tr.String
	}
	if cid.Valid && cid.String != "" {
		u.CompanyID = cid.String
	}

	return &u, nil
}

type PostgresSessionRepository struct {
	db *sql.DB
}

func NewPostgresSessionRepository(db *sql.DB) *PostgresSessionRepository {
	return &PostgresSessionRepository{db: db}
}

func (r *PostgresSessionRepository) Create(ctx context.Context, session *model.Session) error {
	query := `
		INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.db.ExecContext(ctx, query,
		session.ID,
		session.UserID,
		session.TokenHash,
		session.ExpiresAt,
		session.CreatedAt,
	)
	return err
}

func (r *PostgresSessionRepository) GetByTokenHash(ctx context.Context, tokenHash string) (*model.Session, error) {
	query := `
		SELECT id, user_id, token_hash, expires_at, created_at
		FROM sessions
		WHERE token_hash = $1
	`
	var s model.Session
	err := r.db.QueryRowContext(ctx, query, tokenHash).Scan(
		&s.ID,
		&s.UserID,
		&s.TokenHash,
		&s.ExpiresAt,
		&s.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("scan session: %w", err)
	}

	if time.Now().UTC().After(s.ExpiresAt) {
		return nil, ErrSessionExpired
	}

	return &s, nil
}

func (r *PostgresSessionRepository) DeleteByTokenHash(ctx context.Context, tokenHash string) error {
	query := `DELETE FROM sessions WHERE token_hash = $1`
	_, err := r.db.ExecContext(ctx, query, tokenHash)
	return err
}

func (r *PostgresSessionRepository) DeleteAllByUserID(ctx context.Context, userID string) error {
	query := `DELETE FROM sessions WHERE user_id = $1`
	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

func (r *PostgresSessionRepository) DeleteAllExceptCurrent(ctx context.Context, userID, currentTokenHash string) error {
	query := `DELETE FROM sessions WHERE user_id = $1 AND token_hash != $2`
	_, err := r.db.ExecContext(ctx, query, userID, currentTokenHash)
	return err
}

func (r *PostgresSessionRepository) DeleteAllSessions(ctx context.Context, userID string) error {
	return r.DeleteAllByUserID(ctx, userID)
}

func (r *PostgresSessionRepository) DeleteOtherSessions(ctx context.Context, userID, keepTokenHash string) error {
	return r.DeleteAllExceptCurrent(ctx, userID, keepTokenHash)
}

func (r *PostgresSessionRepository) DeleteExpired(ctx context.Context) error {
	query := `DELETE FROM sessions WHERE expires_at <= $1`
	_, err := r.db.ExecContext(ctx, query, time.Now().UTC())
	return err
}
