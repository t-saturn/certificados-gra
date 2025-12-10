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

// GET /certificates?search_query=&status=&page=&page_size=&user_id=
func (h *CertificateHandler) ListCertificates(c fiber.Ctx) (interface{}, string, error) {
	searchQuery := c.Query("search_query", "")
	status := c.Query("status", "") // generated, issued, revoked, etc. (o "all" / "")

	pageStr := c.Query("page", "1")
	pageSizeStr := c.Query("page_size", "10")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		page = 1
	}
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize <= 0 {
		pageSize = 10
	}

	userIDParam := strings.TrimSpace(c.Query("user_id", ""))

	var userIDPtr *uuid.UUID
	if userIDParam != "" {
		id, parseErr := uuid.Parse(userIDParam)
		if parseErr != nil {
			return nil, "", fmt.Errorf("invalid user_id")
		}
		userIDPtr = &id
	}

	in := dto.ListCertificatesQuery{
		SearchQuery: strings.TrimSpace(searchQuery),
		Status:      strings.TrimSpace(status),
		Page:        page,
		PageSize:    pageSize,
		UserID:      userIDPtr,
	}

	docs, filters, err := h.svc.ListCertificates(context.Background(), in)
	if err != nil {
		return nil, "", err
	}

	data := fiber.Map{
		"certificates": docs,    // todos los campos de Document + relaciones
		"filters":      filters, // page, page_size, total, etc.
	}

	return data, "ok", nil
}
