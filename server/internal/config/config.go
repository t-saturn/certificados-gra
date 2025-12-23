package config

import (
	"log"
	"os"
	"strconv"

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

	// Redis
	REDISHost              string
	REDISPort              string
	REDISDB                int
	REDISPassword          string
	REDISQueueDocsGenerate string // queue:docs:generate
	REDISQueueDocsDone     string // queue:docs:generate:done
	REDISJobTTLSeconds     int    // seconds
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

		REDISHost:              getEnv("REDIS_HOST", "127.0.0.1"),
		REDISPort:              getEnv("REDIS_PORT", "6379"),
		REDISDB:                getEnvInt("REDIS_DB", 0),
		REDISPassword:          os.Getenv("REDIS_PASSWORD"),
		REDISQueueDocsGenerate: getEnv("REDIS_QUEUE_DOCS_GENERATE", "queue:docs:generate"),
		REDISQueueDocsDone:     getEnv("REDIS_QUEUE_DOCS_DONE", "queue:docs:generate:done"),
		REDISJobTTLSeconds:     getEnvInt("REDIS_JOB_TTL_SECONDS", 3600),
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

func getEnvInt(key string, fallback int) int {
	if value, exists := os.LookupEnv(key); exists {
		n, err := strconv.Atoi(value)
		if err == nil {
			return n
		}
		log.Printf("%s inválido (%s), usando valor por defecto: %d", key, value, fallback)
		return fallback
	}
	log.Printf("%s no definido, usando valor por defecto: %d", key, fallback)
	return fallback
}
