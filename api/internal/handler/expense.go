package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"strings"

	"go-freelancer/internal/model"
	"go-freelancer/internal/repository"
	"go-freelancer/internal/service"
)

type listExpensesResponse struct {
	Expenses []*model.Expense `json:"expenses"`
}

type expenseResponse struct {
	Expense *model.Expense `json:"expense"`
}

// ListExpenses handles GET /api/v1/expenses.
func (h *Handler) ListExpenses(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	q := r.URL.Query()
	var status *string
	if s := q.Get("status"); s != "" {
		status = &s
	}
	var search *string
	if s := strings.TrimSpace(q.Get("search")); s != "" {
		if len(s) > 100 {
			s = s[:100] // Truncate bounded length to prevent ReDoS / resource exhaustion
		}
		search = &s
	}

	expenses, err := h.expenseSvc.ListExpenses(r.Context(), user.CompanyID, status, search)
	if err != nil {
		h.logger.Error("failed to list expenses", "err", err, "company_id", user.CompanyID)
		h.WriteError(w, http.StatusInternalServerError, "failed to list expenses")
		return
	}

	if expenses == nil {
		expenses = []*model.Expense{}
	}

	_ = h.WriteJSON(w, http.StatusOK, listExpensesResponse{Expenses: expenses})
}

// GetExpense handles GET /api/v1/expenses/{id}.
func (h *Handler) GetExpense(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		h.WriteError(w, http.StatusBadRequest, "expense id is required")
		return
	}

	expense, err := h.expenseSvc.GetExpense(r.Context(), user.CompanyID, id)
	if err != nil {
		if errors.Is(err, repository.ErrExpenseNotFound) {
			h.WriteError(w, http.StatusNotFound, "expense not found")
			return
		}
		h.logger.Error("failed to get expense", "err", err, "id", id)
		h.WriteError(w, http.StatusInternalServerError, "failed to get expense")
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, expenseResponse{Expense: expense})
}

// CreateExpense handles POST /api/v1/expenses.
func (h *Handler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	// Allow up to 15MB request body for phone photo uploads in base64
	r.Body = http.MaxBytesReader(w, r.Body, 15<<20)

	var req model.CreateExpenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	expense, err := h.expenseSvc.CreateExpense(r.Context(), user.CompanyID, &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidMerchantName),
			errors.Is(err, service.ErrInvalidStatus),
			errors.Is(err, service.ErrUnsupportedReceiptType),
			errors.Is(err, service.ErrReceiptTooLarge):
			h.WriteError(w, http.StatusUnprocessableEntity, err.Error())
		default:
			h.logger.Error("failed to create expense", "err", err, "company_id", user.CompanyID)
			h.WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	_ = h.WriteJSON(w, http.StatusCreated, expenseResponse{Expense: expense})
}

// UpdateExpense handles PATCH /api/v1/expenses/{id}.
func (h *Handler) UpdateExpense(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		h.WriteError(w, http.StatusBadRequest, "expense id is required")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 2<<20) // 2MB for update
	var req model.UpdateExpenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	updated, err := h.expenseSvc.UpdateExpense(r.Context(), user.CompanyID, id, &req)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrExpenseNotFound):
			h.WriteError(w, http.StatusNotFound, "expense not found")
		case errors.Is(err, service.ErrInvalidStatus),
			errors.Is(err, service.ErrInvalidMerchantName):
			h.WriteError(w, http.StatusUnprocessableEntity, err.Error())
		default:
			h.logger.Error("failed to update expense", "err", err, "id", id)
			h.WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, expenseResponse{Expense: updated})
}

// DeleteExpense handles DELETE /api/v1/expenses/{id}.
func (h *Handler) DeleteExpense(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		h.WriteError(w, http.StatusBadRequest, "expense id is required")
		return
	}

	if err := h.expenseSvc.DeleteExpense(r.Context(), user.CompanyID, id); err != nil {
		if errors.Is(err, repository.ErrExpenseNotFound) {
			h.WriteError(w, http.StatusNotFound, "expense not found")
			return
		}
		h.logger.Error("failed to delete expense", "err", err, "id", id)
		h.WriteError(w, http.StatusInternalServerError, "failed to delete expense")
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, messageResponse{Message: "expense deleted successfully"})
}

// GetReceipt handles GET /api/v1/receipts/{id}.
// Streams receipt images or PDFs directly to the browser with authentication check.
func (h *Handler) GetReceipt(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		h.WriteError(w, http.StatusBadRequest, "receipt id is required")
		return
	}

	filePath, contentType, err := h.expenseSvc.GetReceiptFile(r.Context(), user.CompanyID, id)
	if err != nil {
		if errors.Is(err, repository.ErrFileNotFound) {
			h.WriteError(w, http.StatusNotFound, "receipt file not found")
			return
		}
		h.WriteError(w, http.StatusInternalServerError, "failed to retrieve receipt")
		return
	}

	file, err := os.Open(filePath)
	if err != nil {
		h.WriteError(w, http.StatusNotFound, "file not found on disk")
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "private, max-age=3600")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, file)
}

