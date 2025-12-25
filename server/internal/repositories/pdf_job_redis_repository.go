package repositories

import (
	"context"
	"time"

	"server/internal/config"
	"server/pkgs/logger"

	"github.com/redis/go-redis/v9"
)

type PdfJobRedisRepository interface {
	PopDoneMessage(ctx context.Context, timeout time.Duration) (string, error)
	GetResults(ctx context.Context, jobID string) ([]string, error)
	GetErrors(ctx context.Context, jobID string) ([]string, error)
}

type pdfJobRedisRepositoryImpl struct {
	redisRepo RedisJobsRepository
}

func NewPdfJobRedisRepository(redisRepo RedisJobsRepository) PdfJobRedisRepository {
	return &pdfJobRedisRepositoryImpl{redisRepo: redisRepo}
}

func (r *pdfJobRedisRepositoryImpl) PopDoneMessage(ctx context.Context, timeout time.Duration) (string, error) {
	if timeout < time.Second {
		timeout = time.Second
	}

	cfg := config.GetConfig()
	queue := cfg.REDISQueueDocsDone

	logger.Log.Info().
		Str("queue", queue).
		Dur("timeout", timeout).
		Msg("pop_done_message start")

	msg, err := r.redisRepo.PopQueueBlocking(ctx, queue, timeout)
	if err == redis.Nil {
		// timeout sin mensaje
		logger.Log.Debug().
			Str("queue", queue).
			Msg("pop_done_message timeout (no message)")
		return "", nil
	}
	if err != nil {
		logger.Log.Error().
			Str("queue", queue).
			Err(err).
			Msg("pop_done_message failed")
		return "", err
	}

	logger.Log.Info().
		Str("queue", queue).
		Int("msg_bytes", len(msg)).
		Msg("pop_done_message ok")

	return msg, nil
}

func (r *pdfJobRedisRepositoryImpl) GetResults(ctx context.Context, jobID string) ([]string, error) {
	return r.redisRepo.GetResults(ctx, jobID)
}

func (r *pdfJobRedisRepositoryImpl) GetErrors(ctx context.Context, jobID string) ([]string, error) {
	return r.redisRepo.GetErrors(ctx, jobID)
}
