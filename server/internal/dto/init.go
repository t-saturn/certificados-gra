package dto

import "time"

// DatabaseHealth representa el estado de la base de datos
type DatabaseHealth struct {
	Status          string `json:"status"`           // "up" | "down" | "unknown"
	Engine          string `json:"engine"`           // "PostgreSQL"
	ResponseTimeMS  int64  `json:"response_time_ms"` // Round-trip aprox. del ping en ms
	OpenConnections int    `json:"open_connections"` // conexiones abiertas
	InUse           int    `json:"in_use"`           // conexiones en uso
	Idle            int    `json:"idle"`             // conexiones ociosas
}

// HealthStatus representa el estado del sistema
type HealthStatus struct {
	Status    string          `json:"status"`
	Timestamp time.Time       `json:"timestamp"`
	Version   string          `json:"version"`
	Database  *DatabaseHealth `json:"database,omitempty"`
}
