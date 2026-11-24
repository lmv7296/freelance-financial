package model

import "time"

// Company represents a business organisation/entity.
type Company struct {
	ID              string     `json:"id"`
	Name            *string    `json:"name"`
	TradeName       *string    `json:"trade_name,omitempty"`
	LegalForm       *string    `json:"legal_form,omitempty"`
	TaxRegime       *string    `json:"tax_regime,omitempty"`
	StartedOn       *time.Time `json:"started_on,omitempty"`
	KVKNumber       *string    `json:"kvk_number,omitempty"`
	KVKBranchNumber *string    `json:"kvk_branch_number,omitempty"`
	VATNumber       *string    `json:"vat_number,omitempty"`
	RSIN            *string    `json:"rsin,omitempty"`
	Street          *string    `json:"street,omitempty"`
	PostalCode      *string    `json:"postal_code,omitempty"`
	City            *string    `json:"city,omitempty"`
	Country         string     `json:"country"`
	Email           *string    `json:"email,omitempty"`
	Phone           *string    `json:"phone,omitempty"`
	Website         *string    `json:"website,omitempty"`
	IBAN            *string    `json:"iban,omitempty"`
	IBANHolderName  *string    `json:"iban_holder_name,omitempty"`
	LogoPath        *string    `json:"logo_path,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}
