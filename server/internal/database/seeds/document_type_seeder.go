package seeds

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"server/internal/models"
	"server/pkgs/logger"

	"gopkg.in/yaml.v3"
	"gorm.io/gorm"
)

type seedDocumentCategory struct {
	Name        string  `yaml:"name"`
	Code        string  `yaml:"code"`
	Description *string `yaml:"description"`
	IsActive    *bool   `yaml:"is_active"`
}

type seedDocumentType struct {
	Code        string                 `yaml:"code"`
	Name        string                 `yaml:"name"`
	Description *string                `yaml:"description"`
	IsActive    *bool                  `yaml:"is_active"`
	Categories  []seedDocumentCategory `yaml:"categories"`
}

func SeedDocumentTypes(db *gorm.DB) error {
	logger.Log.Info("Iniciando seeder de tipos de documento + categorías...")

	path := filepath.Join("internal", "database", "seeds", "data", "document_type.yml")

	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("no se pudo leer el archivo YAML de document_types (%s): %w", path, err)
	}

	var seedDocs []seedDocumentType
	if err := yaml.Unmarshal(data, &seedDocs); err != nil {
		return fmt.Errorf("error al parsear YAML de document_types: %w", err)
	}

	now := time.Now().UTC()

	for _, sd := range seedDocs {
		if sd.Code == "" {
			return fmt.Errorf("document_type sin code definido en YAML")
		}
		if sd.Name == "" {
			return fmt.Errorf("document_type con code '%s' no tiene name", sd.Code)
		}

		isActive := true
		if sd.IsActive != nil {
			isActive = *sd.IsActive
		}

		docType := models.DocumentType{
			Code:        sd.Code,
			Name:        sd.Name,
			Description: sd.Description,
			IsActive:    isActive,
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		// Upsert por Code
		if err := db.
			Where("code = ?", docType.Code).
			Assign(models.DocumentType{
				Name:        docType.Name,
				Code:        docType.Code,
				Description: docType.Description,
				IsActive:    docType.IsActive,
				UpdatedAt:   now,
			}).
			FirstOrCreate(&docType).Error; err != nil {
			return fmt.Errorf("error al hacer seed de document_type '%s': %w", sd.Code, err)
		}

		// Ahora seed de categorías asociadas a ESTE tipo
		for _, sc := range sd.Categories {
			if sc.Name == "" {
				return fmt.Errorf("document_category sin name definido en YAML para type '%s'", sd.Code)
			}

			catIsActive := true
			if sc.IsActive != nil {
				catIsActive = *sc.IsActive
			}

			cat := models.DocumentCategory{
				DocumentTypeID: docType.ID,
				Code:           sc.Code,
				Name:           sc.Name,
				Description:    sc.Description,
				IsActive:       catIsActive,
				CreatedAt:      now,
				UpdatedAt:      now,
			}

			// Upsert por (document_type_id, name) para no duplicar nombres dentro del mismo tipo
			if err := db.
				Where("document_type_id = ? AND name = ?", cat.DocumentTypeID, cat.Name).
				Assign(models.DocumentCategory{
					Code:        cat.Code,
					Description: cat.Description,
					IsActive:    cat.IsActive,
					UpdatedAt:   now,
				}).
				FirstOrCreate(&cat).Error; err != nil {
				return fmt.Errorf("error al hacer seed de document_category '%s' para type '%s': %w", sc.Name, sd.Code, err)
			}
		}
	}

	logger.Log.Infof("Seeder de tipos de documento + categorías completado. Total tipos: %d", len(seedDocs))
	return nil
}
