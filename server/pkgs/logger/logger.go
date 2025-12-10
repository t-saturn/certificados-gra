package logger

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/rs/zerolog"
)

var Log zerolog.Logger

func InitLogger() {
	zerolog.TimeFieldFormat = time.RFC3339
	zerolog.SetGlobalLevel(zerolog.DebugLevel)

	logDir := "logs"
	if err := os.MkdirAll(logDir, os.ModePerm); err != nil {
		fmt.Fprintf(os.Stderr, "No se pudo crear el directorio de logs: %v\n", err)
		os.Exit(1)
	}

	logFile := filepath.Join(logDir, time.Now().Format("2006-01-02")+".log")
	file, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)

	consoleWriter := zerolog.ConsoleWriter{
		Out:        os.Stdout,
		TimeFormat: time.RFC3339,
	}

	writers := []io.Writer{consoleWriter}
	if err == nil {
		writers = append(writers, file)
	}

	multiWriter := zerolog.MultiLevelWriter(writers...)
	Log = zerolog.New(multiWriter).With().Timestamp().Logger()

	if err != nil {
		Log.Warn().Msg("No se pudo abrir el archivo de log, se usará solo salida estándar")
	}
}
