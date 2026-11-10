package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"

	"go-freelancer/internal/model"
)

type TaxVaultRepository interface {
	// Tax Rules
	GetTaxRules(ctx context.Context, taxYear int, legalForm *string) ([]model.TaxRule, error)
	GetAvailableTaxYears(ctx context.Context) ([]int, error)
	SeedTaxRules(ctx context.Context, rules []model.TaxRule) error

	// Tax Profile
	GetTaxProfile(ctx context.Context, companyID string) (*model.TaxProfile, error)
	SaveTaxProfile(ctx context.Context, companyID string, profile model.TaxProfile) error

	// Tax Exports
	GetTaxExports(ctx context.Context, companyID string, taxYear int) ([]model.TaxExport, error)
	CreateTaxExport(ctx context.Context, exp model.TaxExport, companyID string) error
	UpdateTaxExport(ctx context.Context, exp model.TaxExport) error
}

type MemoryTaxVaultRepository struct {
	mu          sync.RWMutex
	rules       []model.TaxRule
	profiles    map[string]model.TaxProfile // companyID -> TaxProfile
	exports     map[string]model.TaxExport  // exportID -> TaxExport
	companyExps map[string][]string         // companyID -> []exportID
	companyRepo CompanyRepository
}

func NewMemoryTaxVaultRepository(companyRepo ...CompanyRepository) *MemoryTaxVaultRepository {
	var cr CompanyRepository
	if len(companyRepo) > 0 {
		cr = companyRepo[0]
	}
	return &MemoryTaxVaultRepository{
		rules:       make([]model.TaxRule, 0),
		profiles:    make(map[string]model.TaxProfile),
		exports:     make(map[string]model.TaxExport),
		companyExps: make(map[string][]string),
		companyRepo: cr,
	}
}

func (r *MemoryTaxVaultRepository) SetCompanyRepository(cr CompanyRepository) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.companyRepo = cr
}

func (r *MemoryTaxVaultRepository) GetTaxRules(ctx context.Context, taxYear int, legalForm *string) ([]model.TaxRule, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var matched []model.TaxRule
	for _, rule := range r.rules {
		if rule.TaxYear != taxYear {
			continue
		}
		if rule.LegalForm != nil && legalForm != nil && *rule.LegalForm != *legalForm {
			continue
		}
		matched = append(matched, rule)
	}
	return matched, nil
}

func (r *MemoryTaxVaultRepository) GetAvailableTaxYears(ctx context.Context) ([]int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	yearMap := make(map[int]bool)
	for _, rule := range r.rules {
		yearMap[rule.TaxYear] = true
	}
	years := make([]int, 0, len(yearMap))
	for y := range yearMap {
		years = append(years, y)
	}
	if len(years) == 0 {
		years = append(years, 2026)
	}
	return years, nil
}

func (r *MemoryTaxVaultRepository) SeedTaxRules(ctx context.Context, rules []model.TaxRule) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Append or replace rules
	r.rules = append(r.rules, rules...)
	return nil
}

func (r *MemoryTaxVaultRepository) GetTaxProfile(ctx context.Context, companyID string) (*model.TaxProfile, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	p, ok := r.profiles[companyID]
	if !ok {
		defaultP := model.DefaultTaxProfile()
		p = defaultP
	}

	if r.companyRepo != nil {
		comp, err := r.companyRepo.GetByID(ctx, companyID)
		if err == nil && comp != nil && comp.LegalForm != nil && *comp.LegalForm != "" {
			p.LegalForm = model.LegalForm(*comp.LegalForm)
		}
	}

	cp := p
	return &cp, nil
}

func (r *MemoryTaxVaultRepository) SaveTaxProfile(ctx context.Context, companyID string, profile model.TaxProfile) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.companyRepo != nil {
		comp, err := r.companyRepo.GetByID(ctx, companyID)
		if err == nil && comp != nil {
			lf := string(profile.LegalForm)
			comp.LegalForm = &lf
			comp.UpdatedAt = time.Now().UTC()
			_ = r.companyRepo.Update(ctx, comp)
		}
	}

	profile.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	r.profiles[companyID] = profile
	return nil
}

func (r *MemoryTaxVaultRepository) GetTaxExports(ctx context.Context, companyID string, taxYear int) ([]model.TaxExport, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	ids := r.companyExps[companyID]
	var list []model.TaxExport
	for i := len(ids) - 1; i >= 0; i-- {
		exp := r.exports[ids[i]]
		if exp.TaxYear == taxYear {
			list = append(list, exp)
		}
	}
	return list, nil
}

func (r *MemoryTaxVaultRepository) CreateTaxExport(ctx context.Context, exp model.TaxExport, companyID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.exports[exp.ID] = exp
	r.companyExps[companyID] = append(r.companyExps[companyID], exp.ID)
	return nil
}

func (r *MemoryTaxVaultRepository) UpdateTaxExport(ctx context.Context, exp model.TaxExport) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.exports[exp.ID] = exp
	return nil
}

// LoadTaxRulesFromJSONFile loads tax rules from a JSON file into models
func LoadTaxRulesFromJSONFile(filePath string) ([]model.TaxRule, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("read tax rules file: %w", err)
	}

	var root struct {
		TaxYear      int `json:"tax_year"`
		Jurisdiction string `json:"jurisdiction"`
		Rules        []struct {
			Key        string                 `json:"key"`
			LegalForm  *string                `json:"legal_form"`
			Label      string                 `json:"label"`
			ValueType  string                 `json:"value_type"`
			Value      json.RawMessage        `json:"value"`
			Conditions map[string]interface{} `json:"conditions"`
			SourceURL  string                 `json:"source_url"`
			VerifiedAt string                 `json:"verified_at"`
			ValidFrom  *string                `json:"valid_from,omitempty"`
			ValidTo    *string                `json:"valid_to,omitempty"`
		} `json:"rules"`
	}

	if err := json.Unmarshal(data, &root); err != nil {
		return nil, fmt.Errorf("unmarshal tax rules JSON: %w", err)
	}

	var rules []model.TaxRule
	for _, r := range root.Rules {
		rules = append(rules, model.TaxRule{
			ID:           fmt.Sprintf("%d-%s", root.TaxYear, r.Key),
			TaxYear:      root.TaxYear,
			Jurisdiction: root.Jurisdiction,
			LegalForm:    r.LegalForm,
			Key:          r.Key,
			Label:        r.Label,
			ValueType:    r.ValueType,
			Value:        r.Value,
			Conditions:   r.Conditions,
			SourceURL:    r.SourceURL,
			VerifiedAt:   r.VerifiedAt,
			ValidFrom:    r.ValidFrom,
			ValidTo:      r.ValidTo,
		})
	}

	return rules, nil
}

