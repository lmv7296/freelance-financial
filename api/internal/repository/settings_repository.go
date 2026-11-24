package repository

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"time"

	"go-freelancer/internal/model"
)

var (
	ErrDuplicatePhone = errors.New("phone number already registered as sender")
	ErrSenderNotFound = errors.New("whatsapp sender not found")
)

// SettingsRepository defines persistence operations for company settings, preferences, and lists.
type SettingsRepository interface {
	GetLists(ctx context.Context, companyID string) (*model.CompanyLists, error)
	SaveLists(ctx context.Context, companyID string, lists *model.CompanyLists) error

	GetCompanySettings(ctx context.Context, companyID string) (*model.CompanySettings, error)
	UpdateCompanySettings(ctx context.Context, companyID string, settings *model.CompanySettings) error
	SaveLogo(companyID, ext string, data []byte) (string, error)
	DeleteLogo(companyID string) error

	GetInvoiceDefaults(ctx context.Context, companyID string) (*model.InvoiceDefaults, error)
	UpdateInvoiceDefaults(ctx context.Context, companyID string, defaults *model.InvoiceDefaults) error

	GetWhatsAppSettings(ctx context.Context, companyID string) (*model.WhatsAppSettings, error)
	CreateWhatsAppSender(ctx context.Context, companyID string, sender *model.WhatsAppSender) error
	UpdateWhatsAppSender(ctx context.Context, companyID, id string, name *string, active *bool) (*model.WhatsAppSender, error)
	DeleteWhatsAppSender(ctx context.Context, companyID, id string) error
	FindSenderByPhone(ctx context.Context, phone string) (companyID string, sender *model.WhatsAppSender, err error)
	UpdateSenderReceiptsCount(ctx context.Context, companyID, senderID string, count int) error

	GetUserPreferences(ctx context.Context, userID string) (*model.UserPreferences, error)
	UpdateUserPreferences(ctx context.Context, userID string, prefs *model.UserPreferences) error
}

// MemorySettingsRepository is a thread-safe in-memory implementation of SettingsRepository.
type MemorySettingsRepository struct {
	mu              sync.RWMutex
	lists           map[string]*model.CompanyLists
	companySettings map[string]*model.CompanySettings
	invoiceDefaults map[string]*model.InvoiceDefaults
	whatsappSenders map[string]map[string]*model.WhatsAppSender // companyID -> senderID -> sender
	receivingNumber map[string]*string                          // companyID -> number
	userPreferences map[string]*model.UserPreferences           // userID -> preferences
	logoDir         string
	companyRepo     CompanyRepository
}

// NewMemorySettingsRepository creates a new MemorySettingsRepository instance.
func NewMemorySettingsRepository(companyRepo ...CompanyRepository) *MemorySettingsRepository {
	var cr CompanyRepository
	if len(companyRepo) > 0 {
		cr = companyRepo[0]
	}
	return &MemorySettingsRepository{
		lists:           make(map[string]*model.CompanyLists),
		companySettings: make(map[string]*model.CompanySettings),
		invoiceDefaults: make(map[string]*model.InvoiceDefaults),
		whatsappSenders: make(map[string]map[string]*model.WhatsAppSender),
		receivingNumber: make(map[string]*string),
		userPreferences: make(map[string]*model.UserPreferences),
		logoDir:         "./uploads/logos",
		companyRepo:     cr,
	}
}

func (r *MemorySettingsRepository) SetCompanyRepository(cr CompanyRepository) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.companyRepo = cr
}

func (r *MemorySettingsRepository) GetLists(ctx context.Context, companyID string) (*model.CompanyLists, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if l, ok := r.lists[companyID]; ok {
		cp := *l
		cp.Merchants = append([]model.QuickSelectMerchant(nil), l.Merchants...)
		cp.Categories = append([]string(nil), l.Categories...)
		cp.PaymentMethods = append([]string(nil), l.PaymentMethods...)
		return &cp, nil
	}

	defaults := model.DefaultCompanyLists()
	return &defaults, nil
}

func (r *MemorySettingsRepository) SaveLists(ctx context.Context, companyID string, lists *model.CompanyLists) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	cp := *lists
	cp.Merchants = append([]model.QuickSelectMerchant(nil), lists.Merchants...)
	cp.Categories = append([]string(nil), lists.Categories...)
	cp.PaymentMethods = append([]string(nil), lists.PaymentMethods...)

	r.lists[companyID] = &cp
	return nil
}

func (r *MemorySettingsRepository) GetCompanySettings(ctx context.Context, companyID string) (*model.CompanySettings, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.companyRepo != nil {
		comp, err := r.companyRepo.GetByID(ctx, companyID)
		if err == nil && comp != nil {
			var logoURL *string
			if comp.LogoPath != nil && *comp.LogoPath != "" {
				u := "/api/v1/settings/company/logo"
				logoURL = &u
			}
			return &model.CompanySettings{
				CompanyName: comp.Name,
				TradeName:   comp.TradeName,
				KVKNumber:   comp.KVKNumber,
				VATNumber:   comp.VATNumber,
				Street:      comp.Street,
				PostalCode:  comp.PostalCode,
				City:        comp.City,
				Country:     &comp.Country,
				Email:       comp.Email,
				Phone:       comp.Phone,
				Website:     comp.Website,
				IBAN:        comp.IBAN,
				LogoURL:     logoURL,
				UpdatedAt:   comp.UpdatedAt.Format(time.RFC3339),
			}, nil
		}
	}

	if s, ok := r.companySettings[companyID]; ok {
		cp := *s
		return &cp, nil
	}

	nl := "NL"
	defaultSettings := &model.CompanySettings{
		Country:   &nl,
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	return defaultSettings, nil
}

func (r *MemorySettingsRepository) UpdateCompanySettings(ctx context.Context, companyID string, settings *model.CompanySettings) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.companyRepo != nil {
		comp, err := r.companyRepo.GetByID(ctx, companyID)
		if err == nil && comp != nil {
			if settings.CompanyName != nil {
				comp.Name = settings.CompanyName
			}
			if settings.TradeName != nil {
				comp.TradeName = settings.TradeName
			}
			if settings.KVKNumber != nil {
				comp.KVKNumber = settings.KVKNumber
			}
			if settings.VATNumber != nil {
				comp.VATNumber = settings.VATNumber
			}
			if settings.Street != nil {
				comp.Street = settings.Street
			}
			if settings.PostalCode != nil {
				comp.PostalCode = settings.PostalCode
			}
			if settings.City != nil {
				comp.City = settings.City
			}
			if settings.Country != nil {
				comp.Country = *settings.Country
			}
			if settings.Email != nil {
				comp.Email = settings.Email
			}
			if settings.Phone != nil {
				comp.Phone = settings.Phone
			}
			if settings.Website != nil {
				comp.Website = settings.Website
			}
			if settings.IBAN != nil {
				comp.IBAN = settings.IBAN
			}
			comp.UpdatedAt = time.Now().UTC()
			_ = r.companyRepo.Update(ctx, comp)
		}
	}

	cp := *settings
	cp.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	r.companySettings[companyID] = &cp
	return nil
}

func (r *MemorySettingsRepository) SaveLogo(companyID, ext string, data []byte) (string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	dir := filepath.Join(r.logoDir, companyID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}

	filename := "logo" + ext
	fullPath := filepath.Join(dir, filename)

	if err := os.WriteFile(fullPath, data, 0644); err != nil {
		return "", err
	}

	publicURL := "/api/v1/settings/company/logo"

	if r.companyRepo != nil {
		comp, err := r.companyRepo.GetByID(context.Background(), companyID)
		if err == nil && comp != nil {
			comp.LogoPath = &fullPath
			comp.UpdatedAt = time.Now().UTC()
			_ = r.companyRepo.Update(context.Background(), comp)
		}
	}

	s, ok := r.companySettings[companyID]
	if !ok {
		nl := "NL"
		s = &model.CompanySettings{
			Country: &nl,
		}
	}
	s.LogoURL = &publicURL
	s.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	r.companySettings[companyID] = s

	return publicURL, nil
}

func (r *MemorySettingsRepository) DeleteLogo(companyID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	dir := filepath.Join(r.logoDir, companyID)
	_ = os.RemoveAll(dir)

	if r.companyRepo != nil {
		comp, err := r.companyRepo.GetByID(context.Background(), companyID)
		if err == nil && comp != nil {
			comp.LogoPath = nil
			comp.UpdatedAt = time.Now().UTC()
			_ = r.companyRepo.Update(context.Background(), comp)
		}
	}

	if s, ok := r.companySettings[companyID]; ok {
		s.LogoURL = nil
		s.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	}
	return nil
}

func (r *MemorySettingsRepository) GetInvoiceDefaults(ctx context.Context, companyID string) (*model.InvoiceDefaults, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if d, ok := r.invoiceDefaults[companyID]; ok {
		cp := *d
		return &cp, nil
	}

	defaults := model.DefaultInvoiceDefaults()
	defaults.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	return &defaults, nil
}

func (r *MemorySettingsRepository) UpdateInvoiceDefaults(ctx context.Context, companyID string, defaults *model.InvoiceDefaults) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	cp := *defaults
	cp.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	r.invoiceDefaults[companyID] = &cp
	return nil
}

func (r *MemorySettingsRepository) GetWhatsAppSettings(ctx context.Context, companyID string) (*model.WhatsAppSettings, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	recNum := r.receivingNumber[companyID]
	var senders []model.WhatsAppSender

	if companySenders, ok := r.whatsappSenders[companyID]; ok {
		for _, s := range companySenders {
			senders = append(senders, *s)
		}
	}

	if senders == nil {
		senders = []model.WhatsAppSender{}
	}

	return &model.WhatsAppSettings{
		ReceivingNumber: recNum,
		Senders:         senders,
	}, nil
}

func (r *MemorySettingsRepository) CreateWhatsAppSender(ctx context.Context, companyID string, sender *model.WhatsAppSender) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	companySenders, ok := r.whatsappSenders[companyID]
	if !ok {
		companySenders = make(map[string]*model.WhatsAppSender)
		r.whatsappSenders[companyID] = companySenders
	}

	for _, existing := range companySenders {
		if existing.Phone == sender.Phone {
			return ErrDuplicatePhone
		}
	}

	cp := *sender
	companySenders[sender.ID] = &cp
	return nil
}

func (r *MemorySettingsRepository) UpdateWhatsAppSender(ctx context.Context, companyID, id string, name *string, active *bool) (*model.WhatsAppSender, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	companySenders, ok := r.whatsappSenders[companyID]
	if !ok {
		return nil, ErrSenderNotFound
	}

	sender, exists := companySenders[id]
	if !exists {
		return nil, ErrSenderNotFound
	}

	if name != nil {
		sender.Name = *name
	}
	if active != nil {
		sender.Active = *active
	}

	cp := *sender
	return &cp, nil
}

func (r *MemorySettingsRepository) DeleteWhatsAppSender(ctx context.Context, companyID, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	companySenders, ok := r.whatsappSenders[companyID]
	if !ok {
		return ErrSenderNotFound
	}

	if _, exists := companySenders[id]; !exists {
		return ErrSenderNotFound
	}

	delete(companySenders, id)
	return nil
}

func (r *MemorySettingsRepository) FindSenderByPhone(ctx context.Context, phone string) (string, *model.WhatsAppSender, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for compID, senders := range r.whatsappSenders {
		for _, s := range senders {
			if s.Phone == phone {
				cp := *s
				return compID, &cp, nil
			}
		}
	}
	return "", nil, nil
}

func (r *MemorySettingsRepository) UpdateSenderReceiptsCount(ctx context.Context, companyID, senderID string, count int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if senders, ok := r.whatsappSenders[companyID]; ok {
		if s, exists := senders[senderID]; exists {
			s.ReceiptsCount = count
			return nil
		}
	}
	return ErrSenderNotFound
}

func (r *MemorySettingsRepository) GetUserPreferences(ctx context.Context, userID string) (*model.UserPreferences, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if p, ok := r.userPreferences[userID]; ok {
		cp := *p
		return &cp, nil
	}

	defaults := model.DefaultUserPreferences()
	defaults.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	return &defaults, nil
}

func (r *MemorySettingsRepository) UpdateUserPreferences(ctx context.Context, userID string, prefs *model.UserPreferences) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	cp := *prefs
	cp.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	r.userPreferences[userID] = &cp
	return nil
}
