package model

import (
	"context"
	"time"
)

// Backward-compatibility alias
type TaxRegime = LegalForm

const (
	TaxRegimeEenmanszaak = LegalFormEenmanszaak
	TaxRegimeVOF         = LegalFormVOF
	TaxRegimeBV          = LegalFormBV
)

// User represents an authenticated application user.
// Business fields are joined from the companies table as specified in docs/onboarding-backend.md.
type User struct {
	ID           string     `json:"id"`
	Email        string     `json:"email"`
	FullName     *string    `json:"full_name"`
	PhoneNumber  *string    `json:"phone_number"` // E.164, e.g. "+31612345678"
	Country      *string    `json:"country"`      // companies.country, ISO 3166-1 alpha-2, e.g. "NL"
	BusinessName *string    `json:"business_name"` // companies.name
	VATNumber    *string    `json:"vat_number"`   // companies.vat_number, optional
	LegalForm    *LegalForm `json:"legal_form"`   // companies.legal_form (eenmanszaak, vof, bv)
	TaxRegime    *string    `json:"tax_regime"`   // companies.tax_regime, e.g. "NL_BTW_STANDARD"
	IsVerified   bool       `json:"is_verified"`
	CompanyID    string     `json:"company_id"`
	Role         string     `json:"role"`         // "owner" or "member"
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`

	PasswordHash string `json:"-"` // Security: Password hash must NEVER be exposed in JSON
}

// UpdateProfileRequest defines the partial fields updated during onboarding.
type UpdateProfileRequest struct {
	FullName     *string    `json:"full_name"`
	PhoneNumber  *string    `json:"phone_number"`
	Country      *string    `json:"country"`
	BusinessName *string    `json:"business_name"`
	VATNumber    *string    `json:"vat_number"`
	LegalForm    *LegalForm `json:"legal_form"`
	TaxRegime    *LegalForm `json:"tax_regime,omitempty"` // backward-compatibility alias
}

// Session represents an active authenticated session.
type Session struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	TokenHash string    `json:"token_hash"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// EmailVerificationToken represents an active email confirmation token hash.
type EmailVerificationToken struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	TokenHash string    `json:"token_hash"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

type userContextKey struct{}

// WithUser adds the authenticated user to the request context.
func WithUser(ctx context.Context, user *User) context.Context {
	return context.WithValue(ctx, userContextKey{}, user)
}

// GetUserFromContext retrieves the authenticated user from the context.
func GetUserFromContext(ctx context.Context) *User {
	if val := ctx.Value(userContextKey{}); val != nil {
		if u, ok := val.(*User); ok {
			return u
		}
	}
	return nil
}
