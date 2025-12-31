package main

import (
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"gopkg.in/yaml.v3"
	"gorm.io/gorm"

	"server/internal/config"
	"server/internal/domain/models"
	"server/pkg/shared/logger"
)

// YAML structures for seeds
type DocumentTypeSeed struct {
	Code        string         `yaml:"code"`
	Name        string         `yaml:"name"`
	Description string         `yaml:"description"`
	IsActive    bool           `yaml:"is_active"`
	Categories  []CategorySeed `yaml:"categories"`
}

type CategorySeed struct {
	Code     string `yaml:"code"`
	Name     string `yaml:"name"`
	IsActive bool   `yaml:"is_active"`
}

type UserSeed struct {
	ID    string `yaml:"id"`
	Email string `yaml:"email"`
	DNI   string `yaml:"dni"`
}

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	logger.Init(cfg.Server.Environment)

	// Connect to database
	db, err := config.NewPostgresDB(cfg.Database)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}

	log.Info().Msg("Starting seed process...")

	// Seed document types
	if err := seedDocumentTypes(db); err != nil {
		log.Error().Err(err).Msg("Failed to seed document types")
	} else {
		log.Info().Msg("Document types seeded successfully")
	}

	// Seed users
	if err := seedUsers(db); err != nil {
		log.Error().Err(err).Msg("Failed to seed users")
	} else {
		log.Info().Msg("Users seeded successfully")
	}

	log.Info().Msg("Seed process completed")
}

func seedDocumentTypes(db *gorm.DB) error {
	data, err := os.ReadFile("seeds/document_type.yml")
	if err != nil {
		return fmt.Errorf("failed to read document_type.yml: %w", err)
	}

	var seeds []DocumentTypeSeed
	if err := yaml.Unmarshal(data, &seeds); err != nil {
		return fmt.Errorf("failed to parse document_type.yml: %w", err)
	}

	for _, seed := range seeds {
		// Check if already exists
		var existing models.DocumentType
		if err := db.Where("code = ?", seed.Code).First(&existing).Error; err == nil {
			log.Debug().Str("code", seed.Code).Msg("Document type already exists, skipping")
			continue
		}

		description := seed.Description
		docType := models.DocumentType{
			Code:        seed.Code,
			Name:        seed.Name,
			Description: &description,
			IsActive:    seed.IsActive,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		if err := db.Create(&docType).Error; err != nil {
			log.Error().Err(err).Str("code", seed.Code).Msg("Failed to create document type")
			continue
		}

		log.Info().Str("code", seed.Code).Str("id", docType.ID.String()).Msg("Created document type")

		// Create categories
		for _, catSeed := range seed.Categories {
			category := models.DocumentCategory{
				DocumentTypeID: docType.ID,
				Code:           catSeed.Code,
				Name:           catSeed.Name,
				IsActive:       catSeed.IsActive,
				CreatedAt:      time.Now(),
				UpdatedAt:      time.Now(),
			}

			if err := db.Create(&category).Error; err != nil {
				log.Error().Err(err).Str("code", catSeed.Code).Msg("Failed to create category")
				continue
			}

			log.Info().Str("code", catSeed.Code).Uint("id", category.ID).Msg("Created category")
		}
	}

	return nil
}

func seedUsers(db *gorm.DB) error {
	data, err := os.ReadFile("seeds/user.yml")
	if err != nil {
		return fmt.Errorf("failed to read user.yml: %w", err)
	}

	var seeds []UserSeed
	if err := yaml.Unmarshal(data, &seeds); err != nil {
		return fmt.Errorf("failed to parse user.yml: %w", err)
	}

	for _, seed := range seeds {
		// Check if already exists
		var existing models.User
		if err := db.Where("email = ?", seed.Email).First(&existing).Error; err == nil {
			log.Debug().Str("email", seed.Email).Msg("User already exists, skipping")
			continue
		}

		userID, err := uuid.Parse(seed.ID)
		if err != nil {
			log.Error().Err(err).Str("id", seed.ID).Msg("Invalid UUID for user")
			continue
		}

		user := models.User{
			ID:         userID,
			Email:      seed.Email,
			NationalID: seed.DNI,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		if err := db.Create(&user).Error; err != nil {
			log.Error().Err(err).Str("email", seed.Email).Msg("Failed to create user")
			continue
		}

		log.Info().Str("email", seed.Email).Str("id", user.ID.String()).Msg("Created user")
	}

	return nil
}
