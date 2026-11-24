package repository

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"go-freelancer/internal/model"
)

var (
	ErrExpenseNotFound = errors.New("expense not found")
	ErrFileNotFound    = errors.New("receipt file not found")
)

// ExpenseRepository defines persistence operations for expenses.
type ExpenseRepository interface {
	Create(ctx context.Context, expense *model.Expense) error
	GetByID(ctx context.Context, companyID, id string) (*model.Expense, error)
	List(ctx context.Context, companyID string, status *string, search *string) ([]*model.Expense, error)
	Update(ctx context.Context, expense *model.Expense) error
	Delete(ctx context.Context, companyID, id string) error
	SaveReceiptFile(companyID, fileID, ext string, data []byte) (string, error)
	GetReceiptFile(companyID, fileID string) (filePath string, contentType string, err error)
}

// MemoryExpenseRepository is a thread-safe in-memory implementation of ExpenseRepository.
type MemoryExpenseRepository struct {
	mu           sync.RWMutex
	expenses     map[string]*model.Expense // ID -> Expense
	receiptFiles map[string]receiptMeta    // fileID -> meta
	uploadDir    string
}

type receiptMeta struct {
	CompanyID   string
	FilePath    string
	ContentType string
	Data        []byte
}

// NewMemoryExpenseRepository creates a new in-memory expense repository.
func NewMemoryExpenseRepository(uploadDir string) *MemoryExpenseRepository {
	if uploadDir == "" {
		uploadDir = "./uploads/receipts"
	}
	return &MemoryExpenseRepository{
		expenses:     make(map[string]*model.Expense),
		receiptFiles: make(map[string]receiptMeta),
		uploadDir:    uploadDir,
	}
}

func (r *MemoryExpenseRepository) Create(ctx context.Context, expense *model.Expense) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	cp := *expense
	r.expenses[expense.ID] = &cp
	return nil
}

func (r *MemoryExpenseRepository) GetByID(ctx context.Context, companyID, id string) (*model.Expense, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	e, ok := r.expenses[id]
	if !ok || e.CompanyID != companyID {
		return nil, ErrExpenseNotFound
	}
	cp := *e
	return &cp, nil
}

func (r *MemoryExpenseRepository) List(ctx context.Context, companyID string, status *string, search *string) ([]*model.Expense, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*model.Expense
	for _, e := range r.expenses {
		if e.CompanyID != companyID {
			continue
		}
		if status != nil && *status != "" && string(e.Status) != *status {
			continue
		}
		if search != nil && *search != "" {
			term := strings.ToLower(strings.TrimSpace(*search))
			merchantMatch := strings.Contains(strings.ToLower(e.MerchantName), term)
			categoryMatch := e.Category != nil && strings.Contains(strings.ToLower(*e.Category), term)
			notesMatch := e.Notes != nil && strings.Contains(strings.ToLower(*e.Notes), term)
			if !merchantMatch && !categoryMatch && !notesMatch {
				continue
			}
		}

		cp := *e
		result = append(result, &cp)
	}

	// Sort newest first: receipt_date DESC, created_at DESC
	sort.Slice(result, func(i, j int) bool {
		dateI := ""
		if result[i].ReceiptDate != nil {
			dateI = *result[i].ReceiptDate
		}
		dateJ := ""
		if result[j].ReceiptDate != nil {
			dateJ = *result[j].ReceiptDate
		}

		if dateI != dateJ {
			return dateI > dateJ
		}
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})

	return result, nil
}

func (r *MemoryExpenseRepository) Update(ctx context.Context, expense *model.Expense) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	e, ok := r.expenses[expense.ID]
	if !ok || e.CompanyID != expense.CompanyID {
		return ErrExpenseNotFound
	}

	cp := *expense
	r.expenses[expense.ID] = &cp
	return nil
}

func (r *MemoryExpenseRepository) Delete(ctx context.Context, companyID, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	e, ok := r.expenses[id]
	if !ok || e.CompanyID != companyID {
		return ErrExpenseNotFound
	}

	// Remove physical file if present
	if e.ReceiptFilePath != "" {
		_ = os.Remove(e.ReceiptFilePath)
	}

	delete(r.expenses, id)
	return nil
}

func (r *MemoryExpenseRepository) SaveReceiptFile(companyID, fileID, ext string, data []byte) (string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	dir := filepath.Join(r.uploadDir, companyID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}

	filename := fileID + ext
	fullPath := filepath.Join(dir, filename)

	if err := os.WriteFile(fullPath, data, 0644); err != nil {
		return "", err
	}

	var contentType string
	switch strings.ToLower(ext) {
	case ".jpg", ".jpeg":
		contentType = "image/jpeg"
	case ".png":
		contentType = "image/png"
	case ".webp":
		contentType = "image/webp"
	case ".heic":
		contentType = "image/heic"
	case ".pdf":
		contentType = "application/pdf"
	default:
		contentType = "application/octet-stream"
	}

	r.receiptFiles[fileID] = receiptMeta{
		CompanyID:   companyID,
		FilePath:    fullPath,
		ContentType: contentType,
		Data:        data,
	}

	return fullPath, nil
}

func (r *MemoryExpenseRepository) GetReceiptFile(companyID, fileID string) (string, string, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	meta, ok := r.receiptFiles[fileID]
	if !ok || meta.CompanyID != companyID {
		return "", "", ErrFileNotFound
	}

	return meta.FilePath, meta.ContentType, nil
}
