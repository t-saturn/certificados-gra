package config

import (
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	NATS     NATSConfig
}

type ServerConfig struct {
	Host        string
	Port        string
	Environment string
	Version     string
	Prefork     bool
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

type NATSConfig struct {
	URL  string
	Name string
}

func Load() (*Config, error) {
	viper.SetConfigName(".env")
	viper.SetConfigType("env")
	viper.AddConfigPath(".")

	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// Server defaults
	viper.SetDefault("SERVER_HOST", "0.0.0.0")
	viper.SetDefault("SERVER_PORT", "8080")
	viper.SetDefault("SERVER_ENVIRONMENT", "development")
	viper.SetDefault("SERVER_VERSION", "1.0.0")
	viper.SetDefault("SERVER_PREFORK", false)

	// Database defaults (PostgreSQL)
	viper.SetDefault("DB_HOST", "localhost")
	viper.SetDefault("DB_PORT", "5432")
	viper.SetDefault("DB_USER", "postgres")
	viper.SetDefault("DB_PASSWORD", "postgres")
	viper.SetDefault("DB_NAME", "cert_gra")
	viper.SetDefault("DB_SSLMODE", "disable")

	// Redis defaults
	viper.SetDefault("REDIS_HOST", "localhost")
	viper.SetDefault("REDIS_PORT", "6379")
	viper.SetDefault("REDIS_PASSWORD", "")
	viper.SetDefault("REDIS_DB", 0)

	// NATS defaults
	viper.SetDefault("NATS_URL", "nats://localhost:4222")
	viper.SetDefault("NATS_NAME", "cert-server")

	_ = viper.ReadInConfig()

	return &Config{
		Server: ServerConfig{
			Host:        viper.GetString("SERVER_HOST"),
			Port:        viper.GetString("SERVER_PORT"),
			Environment: viper.GetString("SERVER_ENVIRONMENT"),
			Version:     viper.GetString("SERVER_VERSION"),
			Prefork:     viper.GetBool("SERVER_PREFORK"),
		},
		Database: DatabaseConfig{
			Host:     viper.GetString("DB_HOST"),
			Port:     viper.GetString("DB_PORT"),
			User:     viper.GetString("DB_USER"),
			Password: viper.GetString("DB_PASSWORD"),
			Name:     viper.GetString("DB_NAME"),
			SSLMode:  viper.GetString("DB_SSLMODE"),
		},
		Redis: RedisConfig{
			Host:     viper.GetString("REDIS_HOST"),
			Port:     viper.GetString("REDIS_PORT"),
			Password: viper.GetString("REDIS_PASSWORD"),
			DB:       viper.GetInt("REDIS_DB"),
		},
		NATS: NATSConfig{
			URL:  viper.GetString("NATS_URL"),
			Name: viper.GetString("NATS_NAME"),
		},
	}, nil
}
