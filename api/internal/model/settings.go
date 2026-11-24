package model

// QuickSelectMerchant represents a merchant in the quick selection list.
type QuickSelectMerchant struct {
	Name     string  `json:"name"`
	Category *string `json:"category"`
}

// CompanyLists represents the lists configured for a company.
type CompanyLists struct {
	Merchants      []QuickSelectMerchant `json:"merchants"`
	Categories     []string              `json:"categories"`
	PaymentMethods []string              `json:"payment_methods"`
}

// VatRateOption represents a VAT rate item returned in /api/v1/config.
type VatRateOption struct {
	Rate  float64 `json:"rate"`
	Label string  `json:"label"`
	Value string  `json:"value"`
}

// AppConfig represents reference data returned by /api/v1/config.
type AppConfig struct {
	PaymentMethods  []string              `json:"payment_methods"`
	VATRates        []VatRateOption       `json:"vat_rates"`
	Categories      []string              `json:"categories"`
	CommonMerchants []QuickSelectMerchant `json:"common_merchants"`
}

// DefaultCompanyLists returns sensible default lists for a new Dutch ZZP business.
func DefaultCompanyLists() CompanyLists {
	bouwCat := "Bouwmaterialen & Onderdelen"
	gereedCat := "Gereedschap & Apparatuur"
	brandstofCat := "Brandstof & Vervoer"

	return CompanyLists{
		Merchants: []QuickSelectMerchant{
			{Name: "Bouwmaat", Category: &bouwCat},
			{Name: "Hornbach", Category: &bouwCat},
			{Name: "Toolstation", Category: &gereedCat},
			{Name: "Warmteservice", Category: &bouwCat},
			{Name: "Gamma", Category: &bouwCat},
			{Name: "Praxis", Category: &bouwCat},
			{Name: "Shell", Category: &brandstofCat},
			{Name: "TotalEnergies", Category: &brandstofCat},
		},
		Categories: []string{
			"Bouwmaterialen & Onderdelen",
			"Gereedschap & Apparatuur",
			"Brandstof & Vervoer",
			"Kantoor & Administratie",
			"Werkkleding & PBM",
			"Onderhoud & Keuringen",
			"Software & Abonnementen",
			"Overig",
		},
		PaymentMethods: []string{
			"PIN / Betaalpas",
			"Creditcard",
			"iDEAL",
			"Contant",
			"Overboeking",
		},
	}
}

// DefaultVatRates returns default Dutch VAT rates according to official Belastingdienst rules.
func DefaultVatRates() []VatRateOption {
	return []VatRateOption{
		{Rate: 21, Label: "21% Hoog (standaard)", Value: "21"},
		{Rate: 9, Label: "9% Laag (verlaagd)", Value: "9"},
		{Rate: 0, Label: "0% Nul / Vrijgesteld", Value: "0"},
	}
}

// CompanySettings represents company details and official registration information.
type CompanySettings struct {
	CompanyName *string `json:"company_name"`
	TradeName   *string `json:"trade_name"`
	KVKNumber   *string `json:"kvk_number"`
	VATNumber   *string `json:"vat_number"`
	Street      *string `json:"street"`
	PostalCode  *string `json:"postal_code"`
	City        *string `json:"city"`
	Country     *string `json:"country"`
	Email       *string `json:"email"`
	Phone       *string `json:"phone"`
	Website     *string `json:"website"`
	IBAN        *string `json:"iban"`
	LogoURL     *string `json:"logo_url"`
	UpdatedAt   string  `json:"updated_at"`
}

// InvoiceDefaults represents company-wide invoicing numbering and payment rules.
type InvoiceDefaults struct {
	PaymentTermDays      int     `json:"payment_term_days"`
	NumberPrefix         string  `json:"number_prefix"`
	NextNumber           int     `json:"next_number"`
	NumberPadding        int     `json:"number_padding"`
	DefaultVatRate       int     `json:"default_vat_rate"`
	DefaultPaymentMethod *string `json:"default_payment_method"`
	FooterText           *string `json:"footer_text"`
	UpdatedAt            string  `json:"updated_at"`
}

// WhatsAppSender represents a verified phone sender whose receipts are accepted.
type WhatsAppSender struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Phone         string `json:"phone"` // E.164, e.g. "+31612345678"
	Active        bool   `json:"active"`
	ReceiptsCount int    `json:"receipts_count"`
	CreatedAt     string `json:"created_at"`
}

// WhatsAppSettings represents WhatsApp receipt ingestion settings.
type WhatsAppSettings struct {
	ReceivingNumber *string          `json:"receiving_number"`
	Senders         []WhatsAppSender `json:"senders"`
}

// NotificationPreferences controls email reminders.
type NotificationPreferences struct {
	VatDeadlineReminder       bool   `json:"vat_deadline_reminder"`
	VatDeadlineDaysBefore     int    `json:"vat_deadline_days_before"`
	ReceiptsToReview          string `json:"receipts_to_review"` // "off" | "instant" | "daily"
	OverdueInvoices           bool   `json:"overdue_invoices"`
	IncomeTaxDeadlineReminder bool   `json:"income_tax_deadline_reminder"`
}

// UserPreferences represents personal user UI and notification preferences.
type UserPreferences struct {
	Language      string                  `json:"language"` // "nl" | "en"
	Theme         string                  `json:"theme"`    // "system" | "light" | "dark"
	Notifications NotificationPreferences `json:"notifications"`
	UpdatedAt     string                  `json:"updated_at"`
}

// DefaultInvoiceDefaults returns default invoice settings for a Dutch freelancer.
func DefaultInvoiceDefaults() InvoiceDefaults {
	return InvoiceDefaults{
		PaymentTermDays:      14,
		NumberPrefix:         "INV-2026-",
		NextNumber:           1,
		NumberPadding:        4,
		DefaultVatRate:       21,
		DefaultPaymentMethod: nil,
		FooterText:           nil,
	}
}

// DefaultUserPreferences returns default preferences for a new user.
func DefaultUserPreferences() UserPreferences {
	return UserPreferences{
		Language: "nl",
		Theme:    "system",
		Notifications: NotificationPreferences{
			VatDeadlineReminder:       true,
			VatDeadlineDaysBefore:     7,
			ReceiptsToReview:          "daily",
			OverdueInvoices:           true,
			IncomeTaxDeadlineReminder: true,
		},
	}
}

