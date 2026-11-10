package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"go-freelancer/internal/model"
	"go-freelancer/internal/service"
)

type listsResponse struct {
	Lists *model.CompanyLists `json:"lists"`
}

type updateListsPayload struct {
	Lists          *model.CompanyLists         `json:"lists,omitempty"`
	Merchants      []model.QuickSelectMerchant `json:"merchants,omitempty"`
	Categories     []string                    `json:"categories,omitempty"`
	PaymentMethods []string                    `json:"payment_methods,omitempty"`
}

// GetLists handles GET /api/v1/settings/lists.
func (h *Handler) GetLists(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	lists, err := h.settingsSvc.GetLists(r.Context(), user.CompanyID)
	if err != nil {
		h.logger.Error("failed to get lists", "err", err, "company_id", user.CompanyID)
		h.WriteError(w, http.StatusInternalServerError, "failed to retrieve lists")
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, listsResponse{Lists: lists})
}

// UpdateLists handles PUT /api/v1/settings/lists.
func (h *Handler) UpdateLists(w http.ResponseWriter, r *http.Request) {
	user := model.GetUserFromContext(r.Context())
	if user == nil {
		h.WriteError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	bodyBytes, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var payload updateListsPayload
	if err := json.Unmarshal(bodyBytes, &payload); err != nil {
		h.WriteError(w, http.StatusBadRequest, "invalid json payload: "+err.Error())
		return
	}

	var targetLists *model.CompanyLists
	if payload.Lists != nil {
		targetLists = payload.Lists
	} else {
		targetLists = &model.CompanyLists{
			Merchants:      payload.Merchants,
			Categories:     payload.Categories,
			PaymentMethods: payload.PaymentMethods,
		}
	}

	if targetLists.Merchants == nil {
		targetLists.Merchants = []model.QuickSelectMerchant{}
	}
	if targetLists.Categories == nil {
		targetLists.Categories = []string{}
	}
	if targetLists.PaymentMethods == nil {
		targetLists.PaymentMethods = []string{}
	}

	saved, err := h.settingsSvc.UpdateLists(r.Context(), user.CompanyID, targetLists)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrEmptyListItem):
			h.WriteError(w, http.StatusUnprocessableEntity, err.Error())
		case errors.Is(err, service.ErrDuplicateListItem):
			h.WriteError(w, http.StatusUnprocessableEntity, err.Error())
		default:
			h.logger.Error("failed to update lists", "err", err, "company_id", user.CompanyID)
			h.WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	_ = h.WriteJSON(w, http.StatusOK, listsResponse{Lists: saved})
}

