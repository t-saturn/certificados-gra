package worker

import (
	"context"
	"encoding/json"

	"github.com/nats-io/nats.go"
	"github.com/rs/zerolog/log"

	"server/internal/dto"
	"server/internal/service"
)

type FNPDFWorker struct {
	natsConn *nats.Conn
	docSvc   service.FNDocumentActionService
	subs     []*nats.Subscription
}

// NewFNPDFWorker creates a new FN PDF worker
func NewFNPDFWorker(natsConn *nats.Conn, docSvc service.FNDocumentActionService) *FNPDFWorker {
	return &FNPDFWorker{
		natsConn: natsConn,
		docSvc:   docSvc,
		subs:     make([]*nats.Subscription, 0),
	}
}

// Start starts listening for PDF events
func (w *FNPDFWorker) Start(ctx context.Context) error {
	// subscribe to batch completed
	subCompleted, err := w.natsConn.Subscribe(service.SubjectPDFBatchCompleted, func(msg *nats.Msg) {
		w.handleBatchCompleted(ctx, msg)
	})
	if err != nil {
		return err
	}
	w.subs = append(w.subs, subCompleted)

	// subscribe to batch failed
	subFailed, err := w.natsConn.Subscribe(service.SubjectPDFBatchFailed, func(msg *nats.Msg) {
		w.handleBatchFailed(ctx, msg)
	})
	if err != nil {
		return err
	}
	w.subs = append(w.subs, subFailed)

	// subscribe to individual item completed (optional, for real-time updates)
	subItemCompleted, err := w.natsConn.Subscribe(service.SubjectPDFItemCompleted, func(msg *nats.Msg) {
		w.handleItemCompleted(ctx, msg)
	})
	if err != nil {
		log.Warn().Err(err).Msg("failed to subscribe to item completed events")
	} else {
		w.subs = append(w.subs, subItemCompleted)
	}

	// subscribe to individual item failed (optional, for real-time updates)
	subItemFailed, err := w.natsConn.Subscribe(service.SubjectPDFItemFailed, func(msg *nats.Msg) {
		w.handleItemFailed(ctx, msg)
	})
	if err != nil {
		log.Warn().Err(err).Msg("failed to subscribe to item failed events")
	} else {
		w.subs = append(w.subs, subItemFailed)
	}

	log.Info().
		Str("completed_subject", service.SubjectPDFBatchCompleted).
		Str("failed_subject", service.SubjectPDFBatchFailed).
		Str("item_completed_subject", service.SubjectPDFItemCompleted).
		Str("item_failed_subject", service.SubjectPDFItemFailed).
		Msg("PDF worker started")

	return nil
}

// Stop stops the worker and unsubscribes from all subjects
func (w *FNPDFWorker) Stop() error {
	for _, sub := range w.subs {
		if err := sub.Unsubscribe(); err != nil {
			log.Warn().Err(err).Str("subject", sub.Subject).Msg("failed to unsubscribe")
		}
	}
	w.subs = nil
	log.Info().Msg("PDF worker stopped")
	return nil
}

func (w *FNPDFWorker) handleBatchCompleted(ctx context.Context, msg *nats.Msg) {
	var event dto.PDFBatchCompletedEvent
	if err := json.Unmarshal(msg.Data, &event); err != nil {
		log.Error().Err(err).Str("data", string(msg.Data)).Msg("error unmarshaling batch completed event")
		return
	}

	log.Info().
		Str("pdf_job_id", event.Payload.PDFJobID).
		Str("job_id", event.Payload.JobID).
		Str("status", event.Payload.Status).
		Int("total_items", event.Payload.TotalItems).
		Int("success_count", event.Payload.SuccessCount).
		Int("failed_count", event.Payload.FailedCount).
		Int64("processing_time_ms", event.Payload.ProcessingTimeMS).
		Msg("processing batch completed event")

	if err := w.docSvc.ProcessPDFBatchCompleted(ctx, event.Payload); err != nil {
		log.Error().Err(err).Str("pdf_job_id", event.Payload.PDFJobID).Msg("error processing batch completed")
	} else {
		log.Info().Str("pdf_job_id", event.Payload.PDFJobID).Msg("batch completed processed successfully")
	}
}

func (w *FNPDFWorker) handleBatchFailed(ctx context.Context, msg *nats.Msg) {
	var event dto.PDFBatchFailedEvent
	if err := json.Unmarshal(msg.Data, &event); err != nil {
		log.Error().Err(err).Str("data", string(msg.Data)).Msg("error unmarshaling batch failed event")
		return
	}

	log.Warn().
		Str("pdf_job_id", event.Payload.PDFJobID).
		Str("status", event.Payload.Status).
		Str("message", event.Payload.Message).
		Str("code", event.Payload.Code).
		Msg("processing batch failed event")

	if err := w.docSvc.ProcessPDFBatchFailed(ctx, event.Payload); err != nil {
		log.Error().Err(err).Str("pdf_job_id", event.Payload.PDFJobID).Msg("error processing batch failed")
	} else {
		log.Warn().Str("pdf_job_id", event.Payload.PDFJobID).Msg("batch failed processed successfully")
	}
}

func (w *FNPDFWorker) handleItemCompleted(ctx context.Context, msg *nats.Msg) {
	// parse item completed event for real-time logging
	var data map[string]interface{}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		return
	}

	payload, ok := data["payload"].(map[string]interface{})
	if !ok {
		return
	}

	log.Debug().
		Str("pdf_job_id", getString(payload, "pdf_job_id")).
		Str("item_id", getString(payload, "item_id")).
		Str("serial_code", getString(payload, "serial_code")).
		Str("status", getString(payload, "status")).
		Msg("item completed event received")
}

func (w *FNPDFWorker) handleItemFailed(ctx context.Context, msg *nats.Msg) {
	// parse item failed event for real-time logging
	var data map[string]interface{}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		return
	}

	payload, ok := data["payload"].(map[string]interface{})
	if !ok {
		return
	}

	log.Warn().
		Str("pdf_job_id", getString(payload, "pdf_job_id")).
		Str("item_id", getString(payload, "item_id")).
		Str("serial_code", getString(payload, "serial_code")).
		Str("status", getString(payload, "status")).
		Str("message", getString(payload, "message")).
		Str("stage", getString(payload, "stage")).
		Str("code", getString(payload, "code")).
		Msg("item failed event received")
}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}