package handlers

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"server/internal/dto"
	"server/internal/services"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type CertificateHandler struct {
	svc services.CertificateService
}

func NewCertificateHandler(svc services.CertificateService) *CertificateHandler {
	return &CertificateHandler{svc: svc}
}

// GET /certificates?search_query=&signature_status=&event_id=&page=&page_size=&user_id=
func (h *CertificateHandler) ListCertificates(c fiber.Ctx) (interface{}, string, error) {
	searchQuery := strings.TrimSpace(c.Query("search_query", ""))
	signatureStatus := strings.TrimSpace(c.Query("signature_status", "all"))

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page <= 0 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("page_size", "10"))
	if pageSize <= 0 {
		pageSize = 10
	}

	// event_id opcional
	eventIDParam := strings.TrimSpace(c.Query("event_id", ""))
	var eventIDPtr *uuid.UUID
	if eventIDParam != "" {
		id, err := uuid.Parse(eventIDParam)
		if err != nil {
			return nil, "", fmt.Errorf("invalid event_id")
		}
		eventIDPtr = &id
	}

	// user_id opcional
	userIDParam := strings.TrimSpace(c.Query("user_id", ""))
	var userIDPtr *uuid.UUID
	if userIDParam != "" {
		id, err := uuid.Parse(userIDParam)
		if err != nil {
			return nil, "", fmt.Errorf("invalid user_id")
		}
		userIDPtr = &id
	}

	in := dto.ListCertificatesQuery{
		SearchQuery:     searchQuery,
		SignatureStatus: signatureStatus,
		EventID:         eventIDPtr,
		Page:            page,
		PageSize:        pageSize,
		UserID:          userIDPtr,
	}

	resp, err := h.svc.ListCertificates(context.Background(), in)
	if err != nil {
		return nil, "", err
	}

	data := fiber.Map{
		"items":      resp.Items,
		"pagination": resp.Pagination,
		"filters":    resp.Filters,
	}

	return data, "ok", nil
}

// GET /certificates/:id
func (h *CertificateHandler) GetCertificateByID(c fiber.Ctx) (interface{}, string, error) {
	idParam := strings.TrimSpace(c.Params("id", ""))
	id, err := uuid.Parse(idParam)
	if err != nil {
		return nil, "", fmt.Errorf("invalid certificate id")
	}

	doc, err := h.svc.GetCertificateByID(context.Background(), id)
	if err != nil {
		return nil, "", err
	}

	data := fiber.Map{
		"certificate": doc,
	}

	return data, "ok", nil
}
