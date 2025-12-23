package handlers

import (
	"errors"

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
// ✅ compatible con httpwrap.Wrap
func (h *PdfJobHandler) EnqueueGenerateDocs(c fiber.Ctx) (interface{}, string, error) {
	var req dto.EnqueuePdfJobRequest
	if err := c.Bind().Body(&req); err != nil {
		return nil, "", err
	}
	if len(req.Items) == 0 {
		return nil, "", errors.New("items is required")
	}

	out, err := h.svc.EnqueueGenerateDocs(c.Context(), req)
	if err != nil {
		return nil, "", err
	}

	return out, "job enqueued", nil
}
