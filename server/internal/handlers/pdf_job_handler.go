package handlers

import (
	"context"
	"fmt"

	"server/internal/dto"
	"server/internal/services"

	"github.com/gofiber/fiber/v3"
)

type PdfJobHandler struct {
	svc services.PdfJobService
}

func NewPdfJobHandler(svc services.PdfJobService) *PdfJobHandler {
	return &PdfJobHandler{svc: svc}
}

// POST /pdf-jobs/generate-docs
func (h *PdfJobHandler) GenerateDocs(c fiber.Ctx) (interface{}, string, error) {
	var req dto.EnqueuePdfJobRequest
	if err := c.Bind().Body(&req); err != nil {
		return nil, "", fmt.Errorf("invalid body")
	}

	res, err := h.svc.GenerateDocs(context.Background(), req)
	if err != nil {
		return nil, "", err
	}

	return fiber.Map{
		"job_id": res.JobID,
		"total":  res.Total,
	}, "ok", nil
}
