package repository

import (
	"context"
	"errors"
	"sync"

	"go-freelancer/internal/model"
)

var (
	ErrCompanyNotFound = errors.New("company not found")
)

// CompanyRepository defines persistence operations for companies.
type CompanyRepository interface {
	Create(ctx context.Context, company *model.Company) error
	GetByID(ctx context.Context, id string) (*model.Company, error)
	Update(ctx context.Context, company *model.Company) error
}

// MemoryCompanyRepository is an in-memory implementation of CompanyRepository.
type MemoryCompanyRepository struct {
	mu        sync.RWMutex
	companies map[string]*model.Company
}

// NewMemoryCompanyRepository creates a new MemoryCompanyRepository instance.
func NewMemoryCompanyRepository() *MemoryCompanyRepository {
	return &MemoryCompanyRepository{
		companies: make(map[string]*model.Company),
	}
}

func (r *MemoryCompanyRepository) Create(ctx context.Context, company *model.Company) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	cp := *company
	r.companies[company.ID] = &cp
	return nil
}

func (r *MemoryCompanyRepository) GetByID(ctx context.Context, id string) (*model.Company, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	c, ok := r.companies[id]
	if !ok {
		return nil, ErrCompanyNotFound
	}
	cp := *c
	return &cp, nil
}

func (r *MemoryCompanyRepository) Update(ctx context.Context, company *model.Company) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	cp := *company
	r.companies[company.ID] = &cp
	return nil
}
