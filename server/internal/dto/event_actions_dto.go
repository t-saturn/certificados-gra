package dto

type EventActionRequest struct {
	Action string `json:"action" validate:"required"` // create_certificates | generate_certificates
}
