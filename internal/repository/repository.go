package repository

import (
	"context"
	"errors"
	"go-freelancer/internal/model"
)

var (
	ErrNotFound = errors.New("resource not found")
)

// Repository defines data access operations.
// As your application grows, you can split this into entity-specific repositories (e.g. UserRepository).
type Repository interface {
	GetItem(ctx context.Context, id string) (*model.Item, error)
}

// NewMemoryRepository returns a placeholder in-memory repository implementation.
func NewMemoryRepository() Repository {
	return &memoryRepository{}
}

type memoryRepository struct{}

func (r *memoryRepository) GetItem(ctx context.Context, id string) (*model.Item, error) {
	// Placeholder: plug in your SQL/Postgres/Mongo driver here.
	return nil, ErrNotFound
}
