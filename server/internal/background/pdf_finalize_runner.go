package background

import (
	"context"
	"time"

	"server/pkgs/logger"

	"server/internal/services"
)

type PdfFinalizeRunner struct {
	svc      services.PdfJobFinalizeService
	interval time.Duration
}

func NewPdfFinalizeRunner(svc services.PdfJobFinalizeService, interval time.Duration) *PdfFinalizeRunner {
	if interval <= 0 {
		interval = 3 * time.Second
	}
	return &PdfFinalizeRunner{svc: svc, interval: interval}
}

func (r *PdfFinalizeRunner) Start(ctx context.Context) {
	ticker := time.NewTicker(r.interval)

	go func() {
		defer ticker.Stop()
		logger.Log.Info().Msg("pdf finalize runner started")

		for {
			select {
			case <-ctx.Done():
				logger.Log.Info().Msg("pdf finalize runner stopped")
				return
			case <-ticker.C:
				if err := r.svc.Tick(ctx); err != nil {
					logger.Log.Error().Err(err).Msg("pdf finalize tick failed")
				}
			}
		}
	}()
}
