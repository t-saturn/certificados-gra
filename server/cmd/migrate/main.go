package main

import (
	"server/internal/config"
	"server/internal/database/migrations"
	"server/pkgs/logger"

	"github.com/joho/godotenv"
)

func main() {
	logger.InitLogger()

	_ = godotenv.Load()
	config.LoadConfig()
	config.ConnectDB()

	migrations.HandleMigration()
}
