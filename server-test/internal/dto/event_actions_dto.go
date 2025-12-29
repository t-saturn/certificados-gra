package dto

import "github.com/google/uuid"

type EventActionRequest struct {
	Action         string      `json:"action" validate:"required"` // generate_certificates
	ParticipantsID []uuid.UUID `json:"participants_id"`            // nil/[] => todos

	// Formato requerido por pdf-service: "x1,y1,x2,y2"
	// Ej: "460,40,540,120"
	QrRect *string `json:"qr_rect"` // opcional (si nil -> default)
}
