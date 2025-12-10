package main

import (
	"server/internal/config"
	"server/internal/database/seeds"
	"server/pkgs/logger"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	logger.InitLogger()
	logger.Log.Info("Iniciando seeder...")

	config.LoadConfig()
	config.ConnectDB()

	if config.DB == nil {
		logger.Log.Fatal("La conexión a la base de datos es nil")
	}

	logger.Log.Info("Ejecutando seeders...")

	if err := seeds.Run(config.DB); err != nil {
		logger.Log.Fatalf("Error al ejecutar los seeders: %v", err)
	}

	logger.Log.Info("Seeders ejecutados correctamente")
}
