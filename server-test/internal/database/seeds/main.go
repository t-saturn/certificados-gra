package seeds

import (
	"server/pkgs/logger"

	"gorm.io/gorm"
)

func Run(db *gorm.DB) error {
	seeders := []func(*gorm.DB) error{
		SeedUsers,
		SeedDocumentTypes, // ahora hace tipos + categorías
	}

	for _, seed := range seeders {
		if err := seed(db); err != nil {
			return err
		}
	}

	logger.Log.Info().Msg("Todos los seeders se ejecutaron correctamente")
	return nil
}
