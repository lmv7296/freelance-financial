package service

import (
	"context"
	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
)

// Service defines application business logic.
// You can create sub-services as your application grows (e.g. AuthService, OrderService).
type Service interface {
	GetItem(ctx context.Context, id string) (*model.Item, error)
}

type service struct {
	repo repository.Repository
}

// New creates a new business logic service instance.
func New(repo repository.Repository) Service {
	return &service{
		repo: repo,
	}
}

func (s *service) GetItem(ctx context.Context, id string) (*model.Item, error) {
	return s.repo.GetItem(ctx, id)
}
