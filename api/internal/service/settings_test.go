package service_test

import (
	"context"
	"errors"
	"testing"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
	"go-freelancer/internal/service"
)

func TestSettingsService_DefaultLists(t *testing.T) {
	settingsRepo := repository.NewMemorySettingsRepository()
	svc := service.NewSettingsService(settingsRepo, nil)

	ctx := context.Background()
	companyID := "comp_123"

	lists, err := svc.GetLists(ctx, companyID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(lists.Merchants) == 0 {
		t.Error("expected default merchants to be non-empty")
	}
	if len(lists.Categories) == 0 {
		t.Error("expected default categories to be non-empty")
	}
	if len(lists.PaymentMethods) == 0 {
		t.Error("expected default payment methods to be non-empty")
	}
}

func TestSettingsService_UpdateLists_Success(t *testing.T) {
	settingsRepo := repository.NewMemorySettingsRepository()
	svc := service.NewSettingsService(settingsRepo, nil)

	ctx := context.Background()
	companyID := "comp_123"

	cat := "Bouwmaterialen & Onderdelen"
	newLists := &model.CompanyLists{
		Merchants: []model.QuickSelectMerchant{
			{Name: "  Gamma  ", Category: &cat},
			{Name: "Hornbach", Category: nil},
		},
		Categories: []string{
			"  Bouwmaterialen & Onderdelen ",
			"Gereedschap & Apparatuur",
		},
		PaymentMethods: []string{
			" PIN / Betaalpas ",
			"Contant",
		},
	}

	saved, err := svc.UpdateLists(ctx, companyID, newLists)
	if err != nil {
		t.Fatalf("unexpected error updating lists: %v", err)
	}

	if len(saved.Merchants) != 2 || saved.Merchants[0].Name != "Gamma" {
		t.Errorf("expected trimmed merchant name Gamma, got %q", saved.Merchants[0].Name)
	}
	if len(saved.Categories) != 2 || saved.Categories[0] != "Bouwmaterialen & Onderdelen" {
		t.Errorf("expected trimmed category, got %q", saved.Categories[0])
	}
	if len(saved.PaymentMethods) != 2 || saved.PaymentMethods[0] != "PIN / Betaalpas" {
		t.Errorf("expected trimmed payment method, got %q", saved.PaymentMethods[0])
	}

	// Verify GetConfig reflects this
	cfg, err := svc.GetConfig(ctx, companyID)
	if err != nil {
		t.Fatalf("unexpected error getting config: %v", err)
	}

	if len(cfg.CommonMerchants) != 2 || cfg.CommonMerchants[0].Name != "Gamma" {
		t.Errorf("expected common_merchants[0] == Gamma, got %q", cfg.CommonMerchants[0].Name)
	}
	if len(cfg.Categories) != 2 || cfg.Categories[0] != "Bouwmaterialen & Onderdelen" {
		t.Errorf("expected categories[0], got %q", cfg.Categories[0])
	}
	if len(cfg.PaymentMethods) != 2 || cfg.PaymentMethods[0] != "PIN / Betaalpas" {
		t.Errorf("expected payment_methods[0], got %q", cfg.PaymentMethods[0])
	}
	if len(cfg.VATRates) == 0 {
		t.Error("expected vat_rates to be present")
	}
}

func TestSettingsService_UpdateLists_ValidationErrors(t *testing.T) {
	settingsRepo := repository.NewMemorySettingsRepository()
	svc := service.NewSettingsService(settingsRepo, nil)

	ctx := context.Background()
	companyID := "comp_123"

	tests := []struct {
		name      string
		lists     *model.CompanyLists
		targetErr error
	}{
		{
			name: "empty merchant name",
			lists: &model.CompanyLists{
				Merchants:      []model.QuickSelectMerchant{{Name: "   "}},
				Categories:     []string{"Category 1"},
				PaymentMethods: []string{"PIN"},
			},
			targetErr: service.ErrEmptyListItem,
		},
		{
			name: "empty category name",
			lists: &model.CompanyLists{
				Merchants:      []model.QuickSelectMerchant{{Name: "Gamma"}},
				Categories:     []string{"   "},
				PaymentMethods: []string{"PIN"},
			},
			targetErr: service.ErrEmptyListItem,
		},
		{
			name: "empty payment method name",
			lists: &model.CompanyLists{
				Merchants:      []model.QuickSelectMerchant{{Name: "Gamma"}},
				Categories:     []string{"Cat"},
				PaymentMethods: []string{"   "},
			},
			targetErr: service.ErrEmptyListItem,
		},
		{
			name: "case-insensitive duplicate merchant",
			lists: &model.CompanyLists{
				Merchants: []model.QuickSelectMerchant{
					{Name: "Gamma"},
					{Name: "gamma"},
				},
				Categories:     []string{"Cat"},
				PaymentMethods: []string{"PIN"},
			},
			targetErr: service.ErrDuplicateListItem,
		},
		{
			name: "case-insensitive duplicate category",
			lists: &model.CompanyLists{
				Merchants: []model.QuickSelectMerchant{{Name: "Gamma"}},
				Categories: []string{
					"Bouwmaterialen",
					"BOUWMATERIALEN",
				},
				PaymentMethods: []string{"PIN"},
			},
			targetErr: service.ErrDuplicateListItem,
		},
		{
			name: "case-insensitive duplicate payment method",
			lists: &model.CompanyLists{
				Merchants:  []model.QuickSelectMerchant{{Name: "Gamma"}},
				Categories: []string{"Bouw"},
				PaymentMethods: []string{
					"iDEAL",
					"ideal",
				},
			},
			targetErr: service.ErrDuplicateListItem,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := svc.UpdateLists(ctx, companyID, tc.lists)
			if err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !errors.Is(err, tc.targetErr) {
				t.Errorf("expected error %v, got %v", tc.targetErr, err)
			}
		})
	}
}

