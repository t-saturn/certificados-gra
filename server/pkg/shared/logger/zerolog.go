package logger

import (
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Init initializes the global logger with console and file output
func Init(environment string) {
	// Create logs directory
	logsDir := "logs"
	_ = os.MkdirAll(logsDir, 0755)

	// Create log file with date
	logFileName := time.Now().Format("2006-01-02") + ".log"
	logFilePath := filepath.Join(logsDir, logFileName)

	logFile, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		logFile = os.Stdout
	}

	// Console writer for pretty output
	consoleWriter := zerolog.ConsoleWriter{
		Out:        os.Stdout,
		TimeFormat: time.RFC3339,
		NoColor:    false,
	}

	// Multi-writer: console + file
	multi := io.MultiWriter(consoleWriter, logFile)

	// Configure zerolog
	zerolog.TimeFieldFormat = time.RFC3339

	// Set log level based on environment
	if environment == "production" {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	} else {
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	}

	log.Logger = zerolog.New(multi).
		With().
		Timestamp().
		Caller().
		Str("service", "cert-server").
		Logger()
}

// SetLevel sets the global log level
func SetLevel(level string) {
	switch level {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "info":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
}
