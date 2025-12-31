package dto

type Response struct {
	Data    interface{} `json:"data"`
	Status  string      `json:"status"` // "success" | "failed"
	Message string      `json:"message"`
}
