package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type PdfJobMeta struct {
	Status    string `json:"status"`
	Total     string `json:"total"`
	Processed string `json:"processed"`
	Failed    string `json:"failed"`
	PdfJobID  string `json:"pdf_job_id"`
}

type PdfJobResult struct {
	ClientRef       *string `json:"client_ref"` // document_id
	UserID          string  `json:"user_id"`
	FileID          string  `json:"file_id"`
	VerifyCode      *string `json:"verify_code"`
	FileName        *string `json:"file_name"`
	FileHash        *string `json:"file_hash"`
	FileSizeBytes   *int64  `json:"file_size_bytes"`
	StorageProvider *string `json:"storage_provider"`
}

type PdfJobRedisRepository interface {
	GetMeta(ctx context.Context, rustJobID string) (PdfJobMeta, error)
	GetResults(ctx context.Context, rustJobID string) ([]PdfJobResult, error)

	AcquireFinalizeLock(ctx context.Context, rustJobID string, ttl time.Duration) (bool, error)
}

type pdfJobRedisRepositoryImpl struct {
	rdb *redis.Client
}

func NewPdfJobRedisRepository(rdb *redis.Client) PdfJobRedisRepository {
	return &pdfJobRedisRepositoryImpl{rdb: rdb}
}

// func metaKey(jobID string) string    { return fmt.Sprintf("job:%s:meta", jobID) }
// func resultsKey(jobID string) string { return fmt.Sprintf("job:%s:results", jobID) }
func lockKey(jobID string) string { return fmt.Sprintf("lock:finalize:%s", jobID) }

func (r *pdfJobRedisRepositoryImpl) GetMeta(ctx context.Context, rustJobID string) (PdfJobMeta, error) {
	m, err := r.rdb.HGetAll(ctx, metaKey(rustJobID)).Result()
	if err != nil {
		return PdfJobMeta{}, err
	}
	return PdfJobMeta{
		Status:    m["status"],
		Total:     m["total"],
		Processed: m["processed"],
		Failed:    m["failed"],
		PdfJobID:  m["pdf_job_id"],
	}, nil
}

func (r *pdfJobRedisRepositoryImpl) GetResults(ctx context.Context, rustJobID string) ([]PdfJobResult, error) {
	lines, err := r.rdb.LRange(ctx, resultsKey(rustJobID), 0, -1).Result()
	if err != nil {
		return nil, err
	}

	out := make([]PdfJobResult, 0, len(lines))
	for _, ln := range lines {
		var item PdfJobResult
		if err := json.Unmarshal([]byte(ln), &item); err != nil {
			// si una línea viene corrupta, preferible fallar para reintentar
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *pdfJobRedisRepositoryImpl) AcquireFinalizeLock(ctx context.Context, rustJobID string, ttl time.Duration) (bool, error) {
	ok, err := r.rdb.SetNX(ctx, lockKey(rustJobID), "1", ttl).Result()
	return ok, err
}
