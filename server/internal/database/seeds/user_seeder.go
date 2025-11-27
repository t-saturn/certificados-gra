package seeds

import (
	"fmt"
	"os"
	"path/filepath"

	"server/internal/models"
	"server/pkgs/logger"

	"gopkg.in/yaml.v3"
	"gorm.io/gorm"
)

type seedUser struct {
	ID    string `yaml:"id"`
	Email string `yaml:"email"`
	DNI   string `yaml:"dni"`
}

// SeedUsers lee internal/database/seeds/data/user.yml
// y hace upsert de los usuarios en la tabla `users`.
func SeedUsers(db *gorm.DB) error {
	logger.Log.Info("Iniciando seeder de usuarios...")

	// Ruta relativa desde el root del proyecto
	path := filepath.Join("internal", "database", "seeds", "data", "user.yml")

	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("no se pudo leer el archivo YAML de usuarios (%s): %w", path, err)
	}

	var seedUsers []seedUser
	if err := yaml.Unmarshal(data, &seedUsers); err != nil {
		return fmt.Errorf("error al parsear YAML de usuarios: %w", err)
	}

	for _, su := range seedUsers {
		user := models.User{
			ID:         su.ID, // UUID
			Email:      su.Email,
			NationalID: su.DNI,
		}

		// Upsert básico por ID (si existe, actualiza email y dni)
		if err := db.
			Where("id = ?", user.ID).
			Assign(models.User{
				Email:      user.Email,
				NationalID: user.NationalID,
			}).
			FirstOrCreate(&user).Error; err != nil {
			return fmt.Errorf("error al hacer seed del usuario %s: %w", su.Email, err)
		}
	}

	logger.Log.Infof("Seeder de usuarios completado. Total usuarios: %d", len(seedUsers))
	return nil
}
