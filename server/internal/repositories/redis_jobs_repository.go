package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisJobsRepository interface {
	CreateJobMeta(ctx context.Context, jobID string, total int, ttlSeconds int) error
	PushQueue(ctx context.Context, queue string, payload any) error
	GetMeta(ctx context.Context, jobID string) (map[string]string, error)
	GetResults(ctx context.Context, jobID string) ([]string, error)
	GetErrors(ctx context.Context, jobID string) ([]string, error)
}

type redisJobsRepositoryImpl struct{ rdb *redis.Client }

func NewRedisJobsRepository(rdb *redis.Client) RedisJobsRepository {
	return &redisJobsRepositoryImpl{rdb: rdb}
}

func metaKey(jobID string) string { return fmt.Sprintf("job:%s:meta", jobID) }

func resultsKey(jobID string) string { return fmt.Sprintf("job:%s:results", jobID) }

func errorsKey(jobID string) string { return fmt.Sprintf("job:%s:errors", jobID) }

func (r *redisJobsRepositoryImpl) CreateJobMeta(ctx context.Context, jobID string, total int, ttlSeconds int) error {
	mk := metaKey(jobID)

	pipe := r.rdb.Pipeline()

	pipe.HSet(ctx, mk, map[string]any{"status": "QUEUED", "total": total, "processed": 0, "failed": 0})

	ttl := time.Duration(ttlSeconds) * time.Second
	pipe.Expire(ctx, mk, ttl)
	pipe.Expire(ctx, resultsKey(jobID), ttl)
	pipe.Expire(ctx, errorsKey(jobID), ttl)

	_, err := pipe.Exec(ctx)

	return err
}

func (r *redisJobsRepositoryImpl) PushQueue(ctx context.Context, queue string, payload any) error {
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	} // LPUSH para que el worker BRPOP lo tome
	return r.rdb.LPush(ctx, queue, string(b)).Err()
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
