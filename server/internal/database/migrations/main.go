package migrations

import (
	"fmt"
	"os"

	"server/internal/config"
	"server/internal/models"
)

// HandleMigration lee el comando (migrate-up, migrate-down, migrate-reset)
// desde os.Args[1] y ejecuta la acción correspondiente.
func HandleMigration() {
	if config.DB == nil {
		fmt.Println("❌ Database is not initialized. Make sure ConnectDB() sets config.DB")
		os.Exit(1)
	}

	if len(os.Args) < 2 {
		fmt.Println("❌ Missing migration command.")
		fmt.Println("Usage: go run cmd/migrate/main.go [migrate-up | migrate-down | migrate-reset]")
		os.Exit(1)
	}

	cmd := os.Args[1]
	var err error

	switch cmd {
	case "migrate-up":
		err = MigrateUp()
	case "migrate-down":
		err = MigrateDown()
	case "migrate-reset":
		err = MigrateReset()
	default:
		fmt.Printf("❌ Unknown command: %s\n", cmd)
		fmt.Println("Usage: go run cmd/migrate/main.go [migrate-up | migrate-down | migrate-reset]")
		os.Exit(1)
	}

	if err != nil {
		fmt.Printf("❌ Migration command '%s' failed: %v\n", cmd, err)
		os.Exit(1)
	}

	fmt.Printf("✅ Migration command '%s' completed successfully.\n", cmd)
}

// MigrateUp crea/actualiza las tablas usando AutoMigrate.
func MigrateUp() error {
	db := config.DB

	fmt.Println("▶ Running migrate-up...")

	return db.AutoMigrate(
		// CORE CERT
		&models.User{},
		&models.UserDetail{},
		&models.Notification{},

		&models.DocumentType{},     // primero type
		&models.DocumentCategory{}, // luego category
		&models.DocumentTemplate{}, // luego template

		&models.Event{},
		&models.EventSchedule{},
		&models.EventParticipant{},
		&models.Document{},
		&models.DocumentPDF{},

		// EVALUATIONS
		&models.Evaluation{},
		&models.EvaluationQuestion{},
		&models.EvaluationAnswer{},
		&models.EvaluationScore{},
		&models.EvaluationDoc{},

		// STUDY MATERIALS / REFORCEMENT
		&models.StudyMaterial{},
		&models.StudySection{},
		&models.StudySubsection{},
		&models.StudyResource{},
		&models.StudyAnnotation{},
		&models.StudyProgress{},
	)
}

// MigrateDown elimina las tablas (en orden inverso para respetar FKs).
func MigrateDown() error {
	db := config.DB

	fmt.Println("▶ Running migrate-down (dropping tables)...")

	return db.Migrator().DropTable(
		// STUDY MATERIALS (hijas primero)
		&models.StudyProgress{},
		&models.StudyAnnotation{},
		&models.StudyResource{},
		&models.StudySubsection{},
		&models.StudySection{},
		&models.StudyMaterial{},

		// EVALUATIONS
		&models.EvaluationDoc{},
		&models.EvaluationScore{},
		&models.EvaluationAnswer{},
		&models.EvaluationQuestion{},
		&models.Evaluation{},

		// CORE CERT
		&models.DocumentPDF{},
		&models.Document{},
		&models.EventParticipant{},
		&models.EventSchedule{},
		&models.Event{},
		&models.DocumentTemplate{},
		&models.DocumentCategory{},
		&models.DocumentType{},
		&models.Notification{},
		&models.UserDetail{},
		&models.User{},
	)
}

// MigrateReset = Drop + AutoMigrate
func MigrateReset() error {
	fmt.Println("▶ Running migrate-reset (drop + up)...")

	if err := MigrateDown(); err != nil {
		return err
	}
	return MigrateUp()
}
