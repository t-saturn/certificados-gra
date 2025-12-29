package services

import (
	"context"
	"server/internal/dto"
	"time"

	"gorm.io/gorm"
)

type HealthService interface {
	// includeDB: si true, agrega el estado de DB en la respuesta
	Check(includeDB bool) dto.HealthStatus
}

type healthServiceImpl struct {
	version string
	db      *gorm.DB
}

func NewHealthService(version string, db *gorm.DB) HealthService {
	return &healthServiceImpl{
		version: version,
		db:      db,
	}
}

func (s *healthServiceImpl) Check(includeDB bool) dto.HealthStatus {
	now := time.Now().UTC()

	out := dto.HealthStatus{
		Status:    "ok",
		Timestamp: now,
		Version:   s.version,
	}

	if !includeDB || s.db == nil {
		return out
	}

	sqlDB, err := s.db.DB()
	if err != nil {
		// No se pudo obtener *sql.DB, dejamos estado desconocido
		out.Database = &dto.DatabaseHealth{
			Status:          "unknown",
			Engine:          "PostgreSQL",
			ResponseTimeMS:  0,
			OpenConnections: 0,
			InUse:           0,
			Idle:            0,
		}
		return out
	}

	// Medimos tiempo de respuesta del ping con timeout corto
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	start := time.Now()
	pingErr := sqlDB.PingContext(ctx)
	rt := time.Since(start).Milliseconds()
	cancel()

	stats := sqlDB.Stats()

	dbStatus := "up"
	if pingErr != nil {
		dbStatus = "down"
	}

	out.Database = &dto.DatabaseHealth{
		Status:          dbStatus,
		Engine:          "PostgreSQL",
		ResponseTimeMS:  rt,
		OpenConnections: stats.OpenConnections,
		InUse:           stats.InUse,
		Idle:            stats.Idle,
	}

	return out
}
