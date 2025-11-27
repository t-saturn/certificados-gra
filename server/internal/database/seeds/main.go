package seeds

import (
	"server/pkgs/logger"

	"gorm.io/gorm"
)

func Run(db *gorm.DB) error {
	seeders := []func(*gorm.DB) error{
		SeedUsers,
	}

	for _, seed := range seeders {
		if err := seed(db); err != nil {
			return err
		}
	}

	logger.Log.Info("Todos los seeders se ejecutaron correctamente")
	return nil
}
