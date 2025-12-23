package dto

import "github.com/google/uuid"

type EventActionRequest struct {
	Action         string      `json:"action" validate:"required"` // generate_certificates
	ParticipantsID []uuid.UUID `json:"participants_id"`            // nil/[] => todos
}
