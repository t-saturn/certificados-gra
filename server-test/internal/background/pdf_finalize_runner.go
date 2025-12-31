package background

import (
	"context"
	"time"

	"server/internal/services"
	"server/pkgs/logger"
)

type PdfFinalizeRunner struct {
	svc      services.PdfJobFinalizeService
	interval time.Duration
}

func NewPdfFinalizeRunner(svc services.PdfJobFinalizeService, interval time.Duration) *PdfFinalizeRunner {
	return &PdfFinalizeRunner{svc: svc, interval: interval}
}

func (r *PdfFinalizeRunner) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(r.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := r.svc.RunOnce(ctx); err != nil {
					logger.Log.Error().Err(err).Msg("pdf finalize runner tick error")
				}
			}
		}
	}()
}
