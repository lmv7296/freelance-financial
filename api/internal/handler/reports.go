package handler

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"go-freelancer/internal/model"
	"go-freelancer/internal/service/report"
)

// GetReportOptions handles GET /api/v1/reports/options.
func (h *Handler) GetReportOptions(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	options, err := h.reportSvc.GetOptions(r.Context(), user.CompanyID)
	if err != nil {
		h.logger.Error("failed to get report options", "err", err, "company_id", user.CompanyID)
		h.WriteError(w, http.StatusInternalServerError, "Failed to retrieve report options")
		return
	}

	if options.Reports == nil {
		options.Reports = make([]model.ReportItem, 0)
	}
	if options.AvailableYears == nil {
		options.AvailableYears = make([]int, 0)
	}

	_ = h.WriteJSON(w, http.StatusOK, options)
}

// DownloadReport handles GET /api/v1/reports/{key}.
func (h *Handler) DownloadReport(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	key := r.PathValue("key")
	if key == "" {
		h.WriteError(w, http.StatusNotFound, "Report key is required")
		return
	}

	q := r.URL.Query()
	formatStr := q.Get("format")
	fromStr := q.Get("from")
	toStr := q.Get("to")
	langStr := q.Get("lang")

	params := model.ReportParams{
		Key:    model.ReportKey(key),
		Format: model.ReportFormat(formatStr),
		From:   fromStr,
		To:     toStr,
		Lang:   langStr,
	}

	filename, contentType, data, err := h.reportSvc.GenerateReport(r.Context(), user.CompanyID, params)
	if err != nil {
		if errors.Is(err, report.ErrReportNotFound) {
			h.WriteError(w, http.StatusNotFound, fmt.Sprintf("Report '%s' not found", key))
			return
		}
		if errors.Is(err, report.ErrInvalidParams) {
			h.WriteError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		h.logger.Error("failed to generate report", "err", err, "company_id", user.CompanyID, "key", key)
		h.WriteError(w, http.StatusInternalServerError, "Failed to generate report")
		return
	}

	// Content-Disposition: attachment; filename="..."; filename*=UTF-8''...
	encodedFilename := url.PathEscape(filename)
	disposition := fmt.Sprintf("attachment; filename=\"%s\"; filename*=UTF-8''%s", filename, encodedFilename)

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", disposition)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

