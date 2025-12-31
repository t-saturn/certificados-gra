package main

import (
	"flag"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"

	"server/internal/config"
	"server/internal/domain/models"
	"server/pkg/shared/logger"
)

func main() {
	action := flag.String("action", "up", "Migration action: up, down, reset")
	flag.Parse()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load configuration")
	}

	// Initialize logger
	logger.Init(cfg.Server.Environment)

	// Connect to database
	db, err := config.NewPostgresDB(cfg.Database)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}

	switch *action {
	case "up":
		log.Info().Msg("Running migrations UP...")
		if err := migrateUp(db); err != nil {
			log.Fatal().Err(err).Msg("Migration UP failed")
		}
		log.Info().Msg("Migrations UP completed successfully")

	case "down":
		log.Info().Msg("Running migrations DOWN...")
		if err := migrateDown(db); err != nil {
			log.Fatal().Err(err).Msg("Migration DOWN failed")
		}
		log.Info().Msg("Migrations DOWN completed successfully")

	case "reset":
		log.Info().Msg("Running migrations RESET...")
		if err := migrateDown(db); err != nil {
			log.Warn().Err(err).Msg("Migration DOWN failed (tables may not exist)")
		}
		if err := migrateUp(db); err != nil {
			log.Fatal().Err(err).Msg("Migration UP failed")
		}
		log.Info().Msg("Migrations RESET completed successfully")

	default:
		log.Fatal().Str("action", *action).Msg("Invalid action")
	}
}

func migrateUp(db *gorm.DB) error {
	return db.AutoMigrate(
		// Core users
		&models.User{},
		&models.UserDetail{},

		// Notifications
		&models.Notification{},

		// Document types and templates
		&models.DocumentType{},
		&models.DocumentCategory{},
		&models.DocumentTemplate{},
		&models.DocumentTemplateField{},

		// Events
		&models.Event{},
		&models.EventSchedule{},
		&models.EventParticipant{},

		// Documents
		&models.Document{},
		&models.DocumentPDF{},

		// Evaluations
		&models.Evaluation{},
		&models.EvaluationQuestion{},
		&models.EvaluationAnswer{},
		&models.EvaluationScore{},
		&models.EvaluationDoc{},

		// Study materials
		&models.StudyMaterial{},
		&models.StudySection{},
		&models.StudySubsection{},
		&models.StudyResource{},
		&models.StudyAnnotation{},
		&models.StudyProgress{},
	)
}

func migrateDown(db *gorm.DB) error {
	migrator := db.Migrator()

	// Drop in reverse order to handle foreign keys
	tables := []interface{}{
		&models.StudyProgress{},
		&models.StudyAnnotation{},
		&models.StudyResource{},
		&models.StudySubsection{},
		&models.StudySection{},
		&models.StudyMaterial{},
		&models.EvaluationDoc{},
		&models.EvaluationScore{},
		&models.EvaluationAnswer{},
		&models.EvaluationQuestion{},
		&models.Evaluation{},
		&models.DocumentPDF{},
		&models.Document{},
		&models.EventParticipant{},
		&models.EventSchedule{},
		&models.Event{},
		&models.DocumentTemplateField{},
		&models.DocumentTemplate{},
		&models.DocumentCategory{},
		&models.DocumentType{},
		&models.Notification{},
		&models.UserDetail{},
		&models.User{},
	}

	for _, table := range tables {
		if err := migrator.DropTable(table); err != nil {
			return err
		}
	}

	return nil
}
