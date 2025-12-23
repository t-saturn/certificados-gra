package repositories

import (
	"context"
	"encoding/json"

	"github.com/redis/go-redis/v9"
)

type PdfJobQueueRepository interface {
	Enqueue(ctx context.Context, queueName string, payload any) error
}

type pdfJobQueueRepositoryImpl struct {
	rdb *redis.Client
}

func NewPdfJobQueueRepository(rdb *redis.Client) PdfJobQueueRepository {
	return &pdfJobQueueRepositoryImpl{rdb: rdb}
}

func (q *pdfJobQueueRepositoryImpl) Enqueue(ctx context.Context, queueName string, payload any) error {
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return q.rdb.LPush(ctx, queueName, string(b)).Err()
}
