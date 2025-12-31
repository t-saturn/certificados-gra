package repositories

import (
	"context"
	"fmt"

	"server/internal/config"
	"server/internal/dto"
	"server/pkgs/logger"
)

type PdfJobQueueRepository interface {
	EnqueueGenerateDocs(ctx context.Context, job dto.RustDocsGenerateJob, ttlSeconds int) error
}

type pdfJobQueueRepositoryImpl struct {
	redisRepo RedisJobsRepository
}

func NewPdfJobQueueRepository(redisRepo RedisJobsRepository) PdfJobQueueRepository {
	return &pdfJobQueueRepositoryImpl{redisRepo: redisRepo}
}

func (r *pdfJobQueueRepositoryImpl) EnqueueGenerateDocs(ctx context.Context, job dto.RustDocsGenerateJob, ttlSeconds int) error {
	cfg := config.GetConfig()
	if r.redisRepo == nil {
		return fmt.Errorf("redis repo is nil")
	}

	queue := cfg.REDISQueueDocsGenerate

	logger.Log.Info().
		Str("job_id", job.JobID.String()).
		Str("queue", queue).
		Int("ttl_seconds", ttlSeconds).
		Int("items_total", len(job.Items)).
		Str("job_type", string(job.JobType)).
		Msg("enqueue_generate_docs start")

	// NO ignores error
	if err := r.redisRepo.CreateJobMeta(ctx, job.JobID.String(), len(job.Items), ttlSeconds); err != nil {
		logger.Log.Error().
			Str("job_id", job.JobID.String()).
			Err(err).
			Msg("enqueue_generate_docs create_job_meta failed")
		return err
	}

	if err := r.redisRepo.PushQueue(ctx, queue, job); err != nil {
		logger.Log.Error().
			Str("job_id", job.JobID.String()).
			Str("queue", queue).
			Err(err).
			Msg("enqueue_generate_docs push_queue failed")
		return err
	}

	// opcional: leer meta para confirmar que existe
	meta, err := r.redisRepo.GetMeta(ctx, job.JobID.String())
	if err != nil {
		logger.Log.Warn().
			Str("job_id", job.JobID.String()).
			Err(err).
			Msg("enqueue_generate_docs get_meta after enqueue failed")
	} else {
		logger.Log.Info().
			Str("job_id", job.JobID.String()).
			Str("queue", queue).
			Str("status", meta["status"]).
			Str("total", meta["total"]).
			Msg("enqueue_generate_docs ok")
	}

	return nil
}
