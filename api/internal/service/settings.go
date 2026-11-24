package service

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
)

var (
	ErrEmptyListItem           = errors.New("list item name cannot be empty")
	ErrDuplicateListItem       = errors.New("list cannot contain duplicate names")
	ErrInvalidPaymentTermDays  = errors.New("payment_term_days must be between 1 and 365")
	ErrInvalidNextNumber       = errors.New("next_number must be at least 1 and cannot be lower than existing invoice numbers")
	ErrInvalidVATRate          = errors.New("default_vat_rate must be a valid VAT rate (0, 9, or 21)")
	ErrLogoTooLarge            = errors.New("logo file exceeds maximum allowed size of 2MB")
	ErrUnsupportedLogoType     = errors.New("unsupported logo file format; allowed: PNG, JPG, JPEG, SVG")
)

const maxLogoFileSize = 2 * 1024 * 1024 // 2MB

// SettingsService defines business logic for settings, reference lists, and config.
type SettingsService interface {
	GetLists(ctx context.Context, companyID string) (*model.CompanyLists, error)
	UpdateLists(ctx context.Context, companyID string, lists *model.CompanyLists) (*model.CompanyLists, error)
	GetConfig(ctx context.Context, companyID string) (*model.AppConfig, error)

	GetCompanySettings(ctx context.Context, companyID string) (*model.CompanySettings, error)
	UpdateCompanySettings(ctx context.Context, companyID string, settings *model.CompanySettings) (*model.CompanySettings, error)
	UploadLogo(ctx context.Context, companyID string, filename string, data []byte) (*model.CompanySettings, error)
	DeleteLogo(ctx context.Context, companyID string) (*model.CompanySettings, error)

	GetInvoiceDefaults(ctx context.Context, companyID string) (*model.InvoiceDefaults, error)
	UpdateInvoiceDefaults(ctx context.Context, companyID string, defaults *model.InvoiceDefaults) (*model.InvoiceDefaults, error)

	GetWhatsAppSettings(ctx context.Context, companyID string) (*model.WhatsAppSettings, error)
	AddWhatsAppSender(ctx context.Context, companyID string, name, phone string) (*model.WhatsAppSender, error)
	UpdateWhatsAppSender(ctx context.Context, companyID, id string, name *string, active *bool) (*model.WhatsAppSender, error)
	DeleteWhatsAppSender(ctx context.Context, companyID, id string) error

	GetUserPreferences(ctx context.Context, userID string) (*model.UserPreferences, error)
	UpdateUserPreferences(ctx context.Context, userID string, prefs *model.UserPreferences) (*model.UserPreferences, error)
}

type settingsService struct {
	settingsRepo repository.SettingsRepository
	clientRepo   repository.ClientInvoiceRepository
}

// NewSettingsService creates a new SettingsService instance.
func NewSettingsService(settingsRepo repository.SettingsRepository, clientRepo repository.ClientInvoiceRepository) SettingsService {
	return &settingsService{
		settingsRepo: settingsRepo,
		clientRepo:   clientRepo,
	}
}

func (s *settingsService) GetLists(ctx context.Context, companyID string) (*model.CompanyLists, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}
	return s.settingsRepo.GetLists(ctx, companyID)
}

func (s *settingsService) UpdateLists(ctx context.Context, companyID string, lists *model.CompanyLists) (*model.CompanyLists, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}
	if lists == nil {
		return nil, errors.New("lists payload cannot be nil")
	}

	sanitizedMerchants, err := validateAndSanitizeMerchants(lists.Merchants)
	if err != nil {
		return nil, err
	}

	sanitizedCategories, err := validateAndSanitizeStrings(lists.Categories, "category")
	if err != nil {
		return nil, err
	}

	sanitizedPaymentMethods, err := validateAndSanitizeStrings(lists.PaymentMethods, "payment method")
	if err != nil {
		return nil, err
	}

	sanitizedLists := &model.CompanyLists{
		Merchants:      sanitizedMerchants,
		Categories:     sanitizedCategories,
		PaymentMethods: sanitizedPaymentMethods,
	}

	if err := s.settingsRepo.SaveLists(ctx, companyID, sanitizedLists); err != nil {
		return nil, fmt.Errorf("failed to save company lists: %w", err)
	}

	return sanitizedLists, nil
}

func (s *settingsService) GetConfig(ctx context.Context, companyID string) (*model.AppConfig, error) {
	lists, err := s.GetLists(ctx, companyID)
	if err != nil {
		return nil, err
	}

	cfg := &model.AppConfig{
		PaymentMethods:  lists.PaymentMethods,
		VATRates:        model.DefaultVatRates(),
		Categories:      lists.Categories,
		CommonMerchants: lists.Merchants,
	}

	return cfg, nil
}

func (s *settingsService) GetCompanySettings(ctx context.Context, companyID string) (*model.CompanySettings, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}
	return s.settingsRepo.GetCompanySettings(ctx, companyID)
}

func (s *settingsService) UpdateCompanySettings(ctx context.Context, companyID string, settings *model.CompanySettings) (*model.CompanySettings, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}
	if settings == nil {
		return nil, errors.New("company settings payload cannot be nil")
	}

	// Validation: KVK number (8 digits)
	if settings.KVKNumber != nil && *settings.KVKNumber != "" {
		if err := ValidateKVK(*settings.KVKNumber); err != nil {
			return nil, err
		}
	}

	// Validation: VAT number
	country := "NL"
	if settings.Country != nil && *settings.Country != "" {
		country = *settings.Country
	}
	if settings.VATNumber != nil && *settings.VATNumber != "" {
		normVAT, err := ValidateVAT(*settings.VATNumber, country)
		if err != nil {
			return nil, err
		}
		settings.VATNumber = &normVAT
	}

	// Validation: Postal Code (NL)
	if settings.PostalCode != nil && *settings.PostalCode != "" {
		normPC, err := ValidatePostalCodeNL(*settings.PostalCode)
		if err != nil {
			return nil, err
		}
		settings.PostalCode = &normPC
	}

	// Validation: IBAN (ISO 13616 mod-97)
	if settings.IBAN != nil && *settings.IBAN != "" {
		if err := ValidateIBAN(*settings.IBAN); err != nil {
			return nil, err
		}
		normIBAN := strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(*settings.IBAN), " ", ""))
		settings.IBAN = &normIBAN
	}

	if err := s.settingsRepo.UpdateCompanySettings(ctx, companyID, settings); err != nil {
		return nil, fmt.Errorf("failed to update company settings: %w", err)
	}

	return s.settingsRepo.GetCompanySettings(ctx, companyID)
}

func (s *settingsService) UploadLogo(ctx context.Context, companyID string, filename string, data []byte) (*model.CompanySettings, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}
	if len(data) > maxLogoFileSize {
		return nil, ErrLogoTooLarge
	}

	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".png", ".jpg", ".jpeg":
		// valid raster image
	case ".svg":
		sanitized, err := SanitizeSVG(data)
		if err != nil {
			return nil, err
		}
		data = sanitized
	default:
		return nil, ErrUnsupportedLogoType
	}

	if _, err := s.settingsRepo.SaveLogo(companyID, ext, data); err != nil {
		return nil, fmt.Errorf("failed to save logo file: %w", err)
	}

	return s.settingsRepo.GetCompanySettings(ctx, companyID)
}

func (s *settingsService) DeleteLogo(ctx context.Context, companyID string) (*model.CompanySettings, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}
	if err := s.settingsRepo.DeleteLogo(companyID); err != nil {
		return nil, fmt.Errorf("failed to delete logo: %w", err)
	}
	return s.settingsRepo.GetCompanySettings(ctx, companyID)
}

func (s *settingsService) GetInvoiceDefaults(ctx context.Context, companyID string) (*model.InvoiceDefaults, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}
	return s.settingsRepo.GetInvoiceDefaults(ctx, companyID)
}

func (s *settingsService) UpdateInvoiceDefaults(ctx context.Context, companyID string, defaults *model.InvoiceDefaults) (*model.InvoiceDefaults, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}
	if defaults == nil {
		return nil, errors.New("defaults payload cannot be nil")
	}

	// Validate payment_term_days: 1 to 365
	if defaults.PaymentTermDays < 1 || defaults.PaymentTermDays > 365 {
		return nil, ErrInvalidPaymentTermDays
	}

	// Validate next_number: >= 1 and never lower than existing invoice numbers
	if defaults.NextNumber < 1 {
		return nil, ErrInvalidNextNumber
	}

	if s.clientRepo != nil {
		existingInvoices, err := s.clientRepo.ListInvoices(ctx, companyID, nil)
		if err == nil && len(existingInvoices) > 0 {
			maxNum := 0
			for _, inv := range existingInvoices {
				// Extract numeric portion if possible
				num := extractNumericSuffix(inv.InvoiceNumber)
				if num > maxNum {
					maxNum = num
				}
			}
			if maxNum > 0 && defaults.NextNumber <= maxNum {
				return nil, fmt.Errorf("%w: current highest invoice number is %d", ErrInvalidNextNumber, maxNum)
			}
		}
	}

	// Validate default_vat_rate
	if defaults.DefaultVatRate != 0 && defaults.DefaultVatRate != 9 && defaults.DefaultVatRate != 21 {
		return nil, ErrInvalidVATRate
	}

	if defaults.NumberPadding < 1 {
		defaults.NumberPadding = 4
	}

	if err := s.settingsRepo.UpdateInvoiceDefaults(ctx, companyID, defaults); err != nil {
		return nil, fmt.Errorf("failed to update invoice defaults: %w", err)
	}

	return s.settingsRepo.GetInvoiceDefaults(ctx, companyID)
}

func (s *settingsService) GetWhatsAppSettings(ctx context.Context, companyID string) (*model.WhatsAppSettings, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}
	return s.settingsRepo.GetWhatsAppSettings(ctx, companyID)
}

func (s *settingsService) AddWhatsAppSender(ctx context.Context, companyID string, name, phone string) (*model.WhatsAppSender, error) {
	if companyID == "" {
		return nil, errors.New("company ID is required")
	}

	cleanName := strings.TrimSpace(name)
	if cleanName == "" {
		return nil, errors.New("sender name is required")
	}

	normPhone, err := NormalizePhoneE164(phone)
	if err != nil {
		return nil, err
	}

	sender := &model.WhatsAppSender{
		ID:            "ws_" + generateSecureID(16),
		Name:          cleanName,
		Phone:         normPhone,
		Active:        true,
		ReceiptsCount: 0,
		CreatedAt:     time.Now().UTC().Format(time.RFC3339),
	}

	if err := s.settingsRepo.CreateWhatsAppSender(ctx, companyID, sender); err != nil {
		return nil, err
	}

	return sender, nil
}

func (s *settingsService) UpdateWhatsAppSender(ctx context.Context, companyID, id string, name *string, active *bool) (*model.WhatsAppSender, error) {
	if companyID == "" || id == "" {
		return nil, errors.New("company ID and sender ID are required")
	}
	return s.settingsRepo.UpdateWhatsAppSender(ctx, companyID, id, name, active)
}

func (s *settingsService) DeleteWhatsAppSender(ctx context.Context, companyID, id string) error {
	if companyID == "" || id == "" {
		return errors.New("company ID and sender ID are required")
	}
	return s.settingsRepo.DeleteWhatsAppSender(ctx, companyID, id)
}

func (s *settingsService) GetUserPreferences(ctx context.Context, userID string) (*model.UserPreferences, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	return s.settingsRepo.GetUserPreferences(ctx, userID)
}

func (s *settingsService) UpdateUserPreferences(ctx context.Context, userID string, prefs *model.UserPreferences) (*model.UserPreferences, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}
	if prefs == nil {
		return nil, errors.New("preferences payload cannot be nil")
	}

	if prefs.Language != "nl" && prefs.Language != "en" {
		prefs.Language = "nl"
	}
	if prefs.Theme != "system" && prefs.Theme != "light" && prefs.Theme != "dark" {
		prefs.Theme = "system"
	}

	if err := s.settingsRepo.UpdateUserPreferences(ctx, userID, prefs); err != nil {
		return nil, fmt.Errorf("failed to update user preferences: %w", err)
	}

	return s.settingsRepo.GetUserPreferences(ctx, userID)
}

func extractNumericSuffix(invNum string) int {
	var digits strings.Builder
	for i := len(invNum) - 1; i >= 0; i-- {
		ch := invNum[i]
		if ch >= '0' && ch <= '9' {
			digits.WriteByte(ch)
		} else if digits.Len() > 0 {
			break
		}
	}
	if digits.Len() == 0 {
		return 0
	}
	// reverse string
	runes := []rune(digits.String())
	for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
		runes[i], runes[j] = runes[j], runes[i]
	}
	val, _ := strconv.Atoi(string(runes))
	return val
}

func validateAndSanitizeMerchants(merchants []model.QuickSelectMerchant) ([]model.QuickSelectMerchant, error) {
	seen := make(map[string]bool)
	result := make([]model.QuickSelectMerchant, 0, len(merchants))

	for _, m := range merchants {
		cleanName := strings.TrimSpace(m.Name)
		if cleanName == "" {
			return nil, ErrEmptyListItem
		}

		lowerKey := strings.ToLower(cleanName)
		if seen[lowerKey] {
			return nil, fmt.Errorf("%w: merchant %q", ErrDuplicateListItem, cleanName)
		}
		seen[lowerKey] = true

		var cleanCategory *string
		if m.Category != nil {
			trimmedCat := strings.TrimSpace(*m.Category)
			if trimmedCat != "" {
				cleanCategory = &trimmedCat
			}
		}

		result = append(result, model.QuickSelectMerchant{
			Name:     cleanName,
			Category: cleanCategory,
		})
	}

	return result, nil
}

func validateAndSanitizeStrings(items []string, itemType string) ([]string, error) {
	seen := make(map[string]bool)
	result := make([]string, 0, len(items))

	for _, item := range items {
		cleaned := strings.TrimSpace(item)
		if cleaned == "" {
			return nil, ErrEmptyListItem
		}

		lowerKey := strings.ToLower(cleaned)
		if seen[lowerKey] {
			return nil, fmt.Errorf("%w: %s %q", ErrDuplicateListItem, itemType, cleaned)
		}
		seen[lowerKey] = true

		result = append(result, cleaned)
	}

	return result, nil
}
