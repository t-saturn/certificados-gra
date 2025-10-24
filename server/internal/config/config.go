package config

import (
	"log"
	"os"

	"github.com/spf13/viper"
)

type Config struct {
	SERVERPort string
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
}

var cfg Config

func LoadConfig() {
	viper.AutomaticEnv()

	cfg = Config{
		SERVERPort: getEnv("SERVER_PORT", "8000"),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "password"),
		DBName:     getEnv("DB_NAME", "postgres_db"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),
	}
}

func GetConfig() Config {
	return cfg
}

func getEnv(key string, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	log.Printf("%s no definido, usando valor por defecto: %s", key, fallback)
	return fallback
}
