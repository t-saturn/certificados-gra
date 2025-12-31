package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"server/pkgs/logger"

	"github.com/redis/go-redis/v9"
)

type RedisJobsRepository interface {
	CreateJobMeta(ctx context.Context, jobID string, total int, ttlSeconds int) error
	PushQueue(ctx context.Context, queue string, payload any) error
	PopQueueBlocking(ctx context.Context, queue string, timeout time.Duration) (string, error)

	GetMeta(ctx context.Context, jobID string) (map[string]string, error)
	GetResults(ctx context.Context, jobID string) ([]string, error)
	GetErrors(ctx context.Context, jobID string) ([]string, error)
}

type redisJobsRepositoryImpl struct {
	rdb *redis.Client
}

func NewRedisJobsRepository(rdb *redis.Client) RedisJobsRepository {
	return &redisJobsRepositoryImpl{rdb: rdb}
}

func metaKey(jobID string) string    { return fmt.Sprintf("job:%s:meta", jobID) }
func resultsKey(jobID string) string { return fmt.Sprintf("job:%s:results", jobID) }
func errorsKey(jobID string) string  { return fmt.Sprintf("job:%s:errors", jobID) }

func (r *redisJobsRepositoryImpl) CreateJobMeta(ctx context.Context, jobID string, total int, ttlSeconds int) error {
	mk := metaKey(jobID)

	if ttlSeconds <= 0 {
		logger.Log.Warn().
			Str("job_id", jobID).
			Int("ttl_seconds", ttlSeconds).
			Msg("redis CreateJobMeta called with non-positive ttl_seconds (keys may never expire)")
	}

	ttl := time.Duration(ttlSeconds) * time.Second

	logger.Log.Info().
		Str("job_id", jobID).
		Int("total", total).
		Int("ttl_seconds", ttlSeconds).
		Msg("redis CreateJobMeta start")

	pipe := r.rdb.Pipeline()
	pipe.HSet(ctx, mk, map[string]any{
		"status":    "QUEUED",
		"total":     total,
		"processed": 0,
		"failed":    0,
	})
	pipe.Expire(ctx, mk, ttl)
	pipe.Expire(ctx, resultsKey(jobID), ttl)
	pipe.Expire(ctx, errorsKey(jobID), ttl)

	_, err := pipe.Exec(ctx)
	if err != nil {
		logger.Log.Error().
			Str("job_id", jobID).
			Err(err).
			Msg("redis CreateJobMeta pipeline exec failed")
		return err
	}

	// verificación ligera (TTL real)
	metaTTL, _ := r.rdb.TTL(ctx, mk).Result()
	logger.Log.Info().
		Str("job_id", jobID).
		Dur("meta_ttl", metaTTL).
		Msg("redis CreateJobMeta ok")

	return nil
}

func (r *redisJobsRepositoryImpl) PushQueue(ctx context.Context, queue string, payload any) error {
	// pre: len queue
	beforeLen, _ := r.rdb.LLen(ctx, queue).Result()

	b, err := json.Marshal(payload)
	if err != nil {
		logger.Log.Error().
			Str("queue", queue).
			Err(err).
			Msg("redis PushQueue json.Marshal failed")
		return err
	}

	size := len(b)
	// muestra de inicio del payload (no loguear todo)
	preview := string(b)
	if len(preview) > 300 {
		preview = preview[:300] + "..."
	}

	logger.Log.Info().
		Str("queue", queue).
		Int("payload_bytes", size).
		Int64("queue_len_before", beforeLen).
		Msg("redis PushQueue start")

	if err := r.rdb.LPush(ctx, queue, b).Err(); err != nil {
		logger.Log.Error().
			Str("queue", queue).
			Int("payload_bytes", size).
			Err(err).
			Msg("redis PushQueue LPUSH failed")
		return err
	}

	afterLen, _ := r.rdb.LLen(ctx, queue).Result()

	logger.Log.Info().
		Str("queue", queue).
		Int("payload_bytes", size).
		Int64("queue_len_after", afterLen).
		Str("payload_preview", preview).
		Msg("redis PushQueue ok")

	return nil
}

func (r *redisJobsRepositoryImpl) PopQueueBlocking(ctx context.Context, queue string, timeout time.Duration) (string, error) {
	logger.Log.Info().
		Str("queue", queue).
		Dur("timeout", timeout).
		Msg("redis PopQueueBlocking start")

	res, err := r.rdb.BRPop(ctx, timeout, queue).Result()
	if err != nil {
		// redis.Nil lo maneja el caller normalmente
		if err != redis.Nil {
			logger.Log.Error().
				Str("queue", queue).
				Err(err).
				Msg("redis PopQueueBlocking BRPOP failed")
		}
		return "", err
	}

	if len(res) != 2 {
		logger.Log.Error().
			Str("queue", queue).
			Int("res_len", len(res)).
			Msg("redis PopQueueBlocking invalid BRPOP result")
		return "", fmt.Errorf("invalid brpop result")
	}

	msg := res[1]
	preview := msg
	if len(preview) > 300 {
		preview = preview[:300] + "..."
	}

	logger.Log.Info().
		Str("queue", queue).
		Int("msg_bytes", len(msg)).
		Str("msg_preview", preview).
		Msg("redis PopQueueBlocking ok")

	return msg, nil
}

func (r *redisJobsRepositoryImpl) GetMeta(ctx context.Context, jobID string) (map[string]string, error) {
	return r.rdb.HGetAll(ctx, metaKey(jobID)).Result()
}

func (r *redisJobsRepositoryImpl) GetResults(ctx context.Context, jobID string) ([]string, error) {
	return r.rdb.LRange(ctx, resultsKey(jobID), 0, -1).Result()
}

func (r *redisJobsRepositoryImpl) GetErrors(ctx context.Context, jobID string) ([]string, error) {
	return r.rdb.LRange(ctx, errorsKey(jobID), 0, -1).Result()
}
