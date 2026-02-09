package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"

	"server/internal/domain/models"
	"server/internal/dto"
	"server/internal/repository"
)

// nats subjects
const (
	SubjectPDFBatchRequested = "pdf.batch.requested"
	SubjectPDFBatchCompleted = "pdf.batch.completed"
	SubjectPDFBatchFailed    = "pdf.batch.failed"
	SubjectPDFItemCompleted  = "pdf.item.completed"
	SubjectPDFItemFailed     = "pdf.item.failed"
)

// FNDocumentActionService defines the interface for document action business logic
type FNDocumentActionService interface {
	ExecuteAction(ctx context.Context, userID uuid.UUID, req dto.DocumentActionRequest) (*dto.DocumentActionResponse, error)
	ProcessPDFBatchCompleted(ctx context.Context, payload dto.PDFBatchCompletedPayload) error
	ProcessPDFBatchFailed(ctx context.Context, payload dto.PDFBatchFailedPayload) error
	GetByID(ctx context.Context, id uuid.UUID) (*dto.DocumentDetailResponse, error)
	GetBySerialCode(ctx context.Context, serialCode string) (*dto.DocumentDetailResponse, error)
	List(ctx context.Context, params dto.DocumentListQuery) ([]dto.DocumentListItem, int64, error)
}

type fnDocumentActionService struct {
	docRepo        repository.FNDocumentRepository
	docPDFRepo     repository.FNDocumentPDFRepository
	eventRepo      repository.FNEventRepository
	userDetailRepo repository.FNUserDetailRepository
	natsConn       *nats.Conn
}

// NewFNDocumentActionService creates a new FN document action service
func NewFNDocumentActionService(
	docRepo repository.FNDocumentRepository,
	docPDFRepo repository.FNDocumentPDFRepository,
	eventRepo repository.FNEventRepository,
	userDetailRepo repository.FNUserDetailRepository,
	natsConn *nats.Conn,
) FNDocumentActionService {
	return &fnDocumentActionService{
		docRepo:        docRepo,
		docPDFRepo:     docPDFRepo,
		eventRepo:      eventRepo,
		userDetailRepo: userDetailRepo,
		natsConn:       natsConn,
	}
}

func (s *fnDocumentActionService) ExecuteAction(ctx context.Context, userID uuid.UUID, req dto.DocumentActionRequest) (*dto.DocumentActionResponse, error) {
	eventID, err := uuid.Parse(req.EventID)
	if err != nil {
		return nil, fmt.Errorf("invalid event_id")
	}

	event, err := s.eventRepo.GetByID(ctx, eventID)
	if err != nil {
		return nil, fmt.Errorf("error fetching event: %w", err)
	}
	if event == nil {
		return nil, fmt.Errorf("event not found")
	}

	switch req.Action {
	case "reg_doc":
		return s.executeRegDoc(ctx, userID, event, req)
	case "sync_doc":
		return s.executeSyncDoc(ctx, userID, event, req)
	case "gen_doc":
		return s.executeGenDoc(ctx, userID, event, req)
	case "doc_reject":
		return s.executeDocReject(ctx, event, req)
	case "doc_renew":
		return s.executeDocRenew(ctx, event, req)
	default:
		return nil, fmt.Errorf("unknown action: %s", req.Action)
	}
}

func (s *fnDocumentActionService) executeRegDoc(ctx context.Context, userID uuid.UUID, event *models.Event, req dto.DocumentActionRequest) (*dto.DocumentActionResponse, error) {
	now := time.Now().UTC()
	results := make([]dto.DocumentActionResultItem, 0, len(req.Participants))
	processedCount := 0
	failedCount := 0

	for _, p := range req.Participants {
		userDetailID, err := uuid.Parse(p.UserDetailID)
		if err != nil {
			errMsg := "invalid user_detail_id"
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: uuid.Nil,
				Status:       dto.DocStatusPDFFailed,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		existing, err := s.docRepo.GetByEventAndUserDetail(ctx, event.ID, userDetailID)
		if err != nil {
			errMsg := fmt.Sprintf("error checking existing document: %v", err)
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				Status:       dto.DocStatusPDFFailed,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		if existing != nil {
			errMsg := "document already exists for this participant"
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				DocumentID:   existing.ID,
				SerialCode:   existing.SerialCode,
				Status:       existing.Status,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		serialCode, err := s.generateSerialCode(ctx, event)
		if err != nil {
			errMsg := fmt.Sprintf("error generating serial code: %v", err)
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				Status:       dto.DocStatusPDFFailed,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		verificationCode := s.generateVerificationCode()

		doc := &models.Document{
			ID:                     uuid.New(),
			UserDetailID:           userDetailID,
			EventID:                &event.ID,
			TemplateID:             event.TemplateID,
			SerialCode:             serialCode,
			VerificationCode:       verificationCode,
			IssueDate:              now,
			Status:                 dto.DocStatusCreated,
			DigitalSignatureStatus: "PENDING",
			RequiredSignatures:     1,
			SignedSignatures:       0,
			CreatedBy:              userID,
			CreatedAt:              now,
			UpdatedAt:              now,
		}

		if err := s.docRepo.Create(ctx, doc); err != nil {
			errMsg := fmt.Sprintf("error creating document: %v", err)
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				Status:       dto.DocStatusPDFFailed,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		results = append(results, dto.DocumentActionResultItem{
			UserDetailID: userDetailID,
			DocumentID:   doc.ID,
			SerialCode:   serialCode,
			Status:       dto.DocStatusCreated,
		})
		processedCount++
	}

	return &dto.DocumentActionResponse{
		Action:            req.Action,
		EventID:           event.ID,
		TotalParticipants: len(req.Participants),
		ProcessedCount:    processedCount,
		FailedCount:       failedCount,
		Results:           results,
	}, nil
}

func (s *fnDocumentActionService) executeSyncDoc(ctx context.Context, userID uuid.UUID, event *models.Event, req dto.DocumentActionRequest) (*dto.DocumentActionResponse, error) {
	now := time.Now().UTC()
	results := make([]dto.DocumentActionResultItem, 0, len(req.Participants))
	processedCount := 0
	failedCount := 0

	for _, p := range req.Participants {
		userDetailID, err := uuid.Parse(p.UserDetailID)
		if err != nil {
			errMsg := "invalid user_detail_id"
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: uuid.Nil,
				Status:       dto.DocStatusPDFFailed,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		existing, err := s.docRepo.GetByEventAndUserDetail(ctx, event.ID, userDetailID)
		if err != nil {
			errMsg := fmt.Sprintf("error checking existing document: %v", err)
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				Status:       dto.DocStatusPDFFailed,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		if existing != nil {
			existing.UpdatedAt = now
			existing.PdfJobID = nil
			if err := s.docRepo.Update(ctx, existing); err != nil {
				errMsg := fmt.Sprintf("error updating document: %v", err)
				results = append(results, dto.DocumentActionResultItem{
					UserDetailID: userDetailID,
					DocumentID:   existing.ID,
					SerialCode:   existing.SerialCode,
					Status:       existing.Status,
					Error:        &errMsg,
				})
				failedCount++
				continue
			}

			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				DocumentID:   existing.ID,
				SerialCode:   existing.SerialCode,
				Status:       existing.Status,
			})
			processedCount++
			continue
		}

		serialCode, err := s.generateSerialCode(ctx, event)
		if err != nil {
			errMsg := fmt.Sprintf("error generating serial code: %v", err)
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				Status:       dto.DocStatusPDFFailed,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		verificationCode := s.generateVerificationCode()

		doc := &models.Document{
			ID:                     uuid.New(),
			UserDetailID:           userDetailID,
			EventID:                &event.ID,
			TemplateID:             event.TemplateID,
			SerialCode:             serialCode,
			VerificationCode:       verificationCode,
			IssueDate:              now,
			Status:                 dto.DocStatusCreated,
			DigitalSignatureStatus: "PENDING",
			RequiredSignatures:     1,
			SignedSignatures:       0,
			CreatedBy:              userID,
			CreatedAt:              now,
			UpdatedAt:              now,
		}

		if err := s.docRepo.Create(ctx, doc); err != nil {
			errMsg := fmt.Sprintf("error creating document: %v", err)
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				Status:       dto.DocStatusPDFFailed,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		results = append(results, dto.DocumentActionResultItem{
			UserDetailID: userDetailID,
			DocumentID:   doc.ID,
			SerialCode:   serialCode,
			Status:       dto.DocStatusCreated,
		})
		processedCount++
	}

	return &dto.DocumentActionResponse{
		Action:            req.Action,
		EventID:           event.ID,
		TotalParticipants: len(req.Participants),
		ProcessedCount:    processedCount,
		FailedCount:       failedCount,
		Results:           results,
	}, nil
}

func (s *fnDocumentActionService) executeGenDoc(ctx context.Context, userID uuid.UUID, event *models.Event, req dto.DocumentActionRequest) (*dto.DocumentActionResponse, error) {
	if event.TemplateID == nil {
		return nil, fmt.Errorf("event has no template assigned")
	}

	if req.QRConfig == nil {
		return nil, fmt.Errorf("qr_config is required for gen_doc action")
	}

	results := make([]dto.DocumentActionResultItem, 0, len(req.Participants))
	validDocs := make([]*models.Document, 0)
	templateDataMap := make(map[uuid.UUID]map[string]string)
	processedCount := 0
	failedCount := 0

	for _, p := range req.Participants {
		userDetailID, err := uuid.Parse(p.UserDetailID)
		if err != nil {
			errMsg := "invalid user_detail_id"
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: uuid.Nil,
				Status:       dto.DocStatusPDFFailed,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		doc, err := s.docRepo.GetByEventAndUserDetail(ctx, event.ID, userDetailID)
		if err != nil {
			errMsg := fmt.Sprintf("error fetching document: %v", err)
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				Status:       dto.DocStatusPDFFailed,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		if doc == nil {
			errMsg := "document not found, please run sync_doc first"
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				Status:       dto.DocStatusPDFFailed,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		if !s.canGeneratePDF(doc.Status) {
			errMsg := fmt.Sprintf("cannot generate PDF from status '%s'", doc.Status)
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				DocumentID:   doc.ID,
				SerialCode:   doc.SerialCode,
				Status:       doc.Status,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		validDocs = append(validDocs, doc)
		templateDataMap[doc.ID] = p.TemplateData
	}

	if len(validDocs) == 0 {
		return &dto.DocumentActionResponse{
			Action:            req.Action,
			EventID:           event.ID,
			TotalParticipants: len(req.Participants),
			ProcessedCount:    0,
			FailedCount:       failedCount,
			Results:           results,
		}, nil
	}

	pdfJobID := uuid.New()

	batchItems := make([]dto.PDFBatchRequestItem, 0, len(validDocs))
	for _, doc := range validDocs {
		templateData := templateDataMap[doc.ID]
		
		pdfKeyValues := make([]dto.PDFKeyValue, 0)
		for key, value := range templateData {
			pdfKeyValues = append(pdfKeyValues, dto.PDFKeyValue{Key: key, Value: value})
		}

		qrKeyValues := []dto.PDFKeyValue{
			{Key: "base_url", Value: req.QRConfig.BaseURL},
			{Key: "verify_code", Value: doc.VerificationCode},
		}

		qrPDFKeyValues := []dto.PDFKeyValue{
			{Key: "qr_size_cm", Value: fmt.Sprintf("%.2f", req.QRConfig.QRSizeCM)},
			{Key: "qr_margin_y_cm", Value: fmt.Sprintf("%.2f", req.QRConfig.QRMarginYCM)},
			{Key: "qr_page", Value: fmt.Sprintf("%d", req.QRConfig.QRPage)},
		}

		batchItems = append(batchItems, dto.PDFBatchRequestItem{
			UserID:     doc.UserDetailID.String(),
			TemplateID: event.TemplateID.String(),
			SerialCode: doc.SerialCode,
			IsPublic:   event.IsPublic,
			PDF:        pdfKeyValues,
			QR:         qrKeyValues,
			QRPDF:      qrPDFKeyValues,
		})
	}

	batchEvent := dto.PDFBatchRequestEvent{
		EventType: "pdf.batch.requested",
		Payload: dto.PDFBatchRequestPayload{
			PDFJobID: pdfJobID.String(),
			Items:    batchItems,
		},
	}

	eventData, err := json.Marshal(batchEvent)
	if err != nil {
		return nil, fmt.Errorf("error marshaling batch event: %w", err)
	}

	for _, doc := range validDocs {
		if err := s.docRepo.UpdatePDFJobID(ctx, doc.ID, pdfJobID); err != nil {
			continue
		}
		if err := s.docRepo.UpdateStatus(ctx, doc.ID, dto.DocStatusPDFPending); err != nil {
			continue
		}

		results = append(results, dto.DocumentActionResultItem{
			UserDetailID: doc.UserDetailID,
			DocumentID:   doc.ID,
			SerialCode:   doc.SerialCode,
			Status:       dto.DocStatusPDFPending,
		})
		processedCount++
	}

	if err := s.natsConn.Publish(SubjectPDFBatchRequested, eventData); err != nil {
		docIDs := make([]uuid.UUID, 0, len(validDocs))
		for _, doc := range validDocs {
			docIDs = append(docIDs, doc.ID)
		}
		_ = s.docRepo.BulkUpdateStatus(ctx, docIDs, dto.DocStatusPDFFailed)

		return nil, fmt.Errorf("error publishing pdf batch event: %w", err)
	}

	return &dto.DocumentActionResponse{
		Action:            req.Action,
		EventID:           event.ID,
		PDFJobID:          &pdfJobID,
		TotalParticipants: len(req.Participants),
		ProcessedCount:    processedCount,
		FailedCount:       failedCount,
		Results:           results,
	}, nil
}

func (s *fnDocumentActionService) executeDocReject(ctx context.Context, event *models.Event, req dto.DocumentActionRequest) (*dto.DocumentActionResponse, error) {
	results := make([]dto.DocumentActionResultItem, 0, len(req.Participants))
	processedCount := 0
	failedCount := 0

	for _, p := range req.Participants {
		userDetailID, err := uuid.Parse(p.UserDetailID)
		if err != nil {
			errMsg := "invalid user_detail_id"
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: uuid.Nil,
				Status:       dto.DocStatusPDFFailed,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		doc, err := s.docRepo.GetByEventAndUserDetail(ctx, event.ID, userDetailID)
		if err != nil || doc == nil {
			errMsg := "document not found"
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				Status:       dto.DocStatusPDFFailed,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		if doc.Status == dto.DocStatusRejected {
			errMsg := "document already rejected"
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				DocumentID:   doc.ID,
				SerialCode:   doc.SerialCode,
				Status:       doc.Status,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		if !s.canTransitionTo(doc.Status, dto.DocStatusRejected) {
			errMsg := fmt.Sprintf("cannot reject document from status '%s'", doc.Status)
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				DocumentID:   doc.ID,
				SerialCode:   doc.SerialCode,
				Status:       doc.Status,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		if err := s.docRepo.UpdateStatus(ctx, doc.ID, dto.DocStatusRejected); err != nil {
			errMsg := fmt.Sprintf("error updating status: %v", err)
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				DocumentID:   doc.ID,
				SerialCode:   doc.SerialCode,
				Status:       doc.Status,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		results = append(results, dto.DocumentActionResultItem{
			UserDetailID: userDetailID,
			DocumentID:   doc.ID,
			SerialCode:   doc.SerialCode,
			Status:       dto.DocStatusRejected,
		})
		processedCount++
	}

	return &dto.DocumentActionResponse{
		Action:            req.Action,
		EventID:           event.ID,
		TotalParticipants: len(req.Participants),
		ProcessedCount:    processedCount,
		FailedCount:       failedCount,
		Results:           results,
	}, nil
}

func (s *fnDocumentActionService) executeDocRenew(ctx context.Context, event *models.Event, req dto.DocumentActionRequest) (*dto.DocumentActionResponse, error) {
	results := make([]dto.DocumentActionResultItem, 0, len(req.Participants))
	processedCount := 0
	failedCount := 0

	for _, p := range req.Participants {
		userDetailID, err := uuid.Parse(p.UserDetailID)
		if err != nil {
			errMsg := "invalid user_detail_id"
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: uuid.Nil,
				Status:       dto.DocStatusPDFFailed,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		doc, err := s.docRepo.GetByEventAndUserDetail(ctx, event.ID, userDetailID)
		if err != nil || doc == nil {
			errMsg := "document not found"
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				Status:       dto.DocStatusPDFFailed,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		if !s.canTransitionTo(doc.Status, dto.DocStatusRenew) {
			errMsg := fmt.Sprintf("cannot renew document from status '%s'", doc.Status)
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				DocumentID:   doc.ID,
				SerialCode:   doc.SerialCode,
				Status:       doc.Status,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		if err := s.docRepo.UpdateStatus(ctx, doc.ID, dto.DocStatusRenew); err != nil {
			errMsg := fmt.Sprintf("error updating status: %v", err)
			results = append(results, dto.DocumentActionResultItem{
				UserDetailID: userDetailID,
				DocumentID:   doc.ID,
				SerialCode:   doc.SerialCode,
				Status:       doc.Status,
				Error:        &errMsg,
			})
			failedCount++
			continue
		}

		results = append(results, dto.DocumentActionResultItem{
			UserDetailID: userDetailID,
			DocumentID:   doc.ID,
			SerialCode:   doc.SerialCode,
			Status:       dto.DocStatusRenew,
		})
		processedCount++
	}

	return &dto.DocumentActionResponse{
		Action:            req.Action,
		EventID:           event.ID,
		TotalParticipants: len(req.Participants),
		ProcessedCount:    processedCount,
		FailedCount:       failedCount,
		Results:           results,
	}, nil
}

func (s *fnDocumentActionService) ProcessPDFBatchCompleted(ctx context.Context, payload dto.PDFBatchCompletedPayload) error {
	pdfJobID, err := uuid.Parse(payload.PDFJobID)
	if err != nil {
		return fmt.Errorf("invalid pdf_job_id: %w", err)
	}

	now := time.Now().UTC()

	for _, item := range payload.Items {
		userDetailID, err := uuid.Parse(item.UserID)
		if err != nil {
			continue
		}

		doc, err := s.docRepo.GetDocumentByUserIDAndPDFJobID(ctx, userDetailID, pdfJobID)
		if err != nil || doc == nil {
			continue
		}

		if item.Status == "completed" && item.Data != nil {
			fileID, err := uuid.Parse(item.Data.FileID)
			if err != nil {
				_ = s.docRepo.UpdateStatus(ctx, doc.ID, dto.DocStatusPDFFailed)
				continue
			}

			storageProvider := "pdf-svc"
			docPDF := &models.DocumentPDF{
				ID:              uuid.New(),
				DocumentID:      doc.ID,
				Stage:           "GENERATED",
				Version:         1,
				FileName:        item.Data.FileName,
				FileID:          fileID,
				FileHash:        item.Data.FileHash,
				FileSizeBytes:   &item.Data.FileSize,
				StorageProvider: &storageProvider,
				CreatedAt:       now,
			}

			if err := s.docPDFRepo.Create(ctx, docPDF); err != nil {
				_ = s.docRepo.UpdateStatus(ctx, doc.ID, dto.DocStatusPDFFailed)
				continue
			}

			_ = s.docRepo.UpdateStatus(ctx, doc.ID, dto.DocStatusPDFCompleted)
		} else {
			_ = s.docRepo.UpdateStatus(ctx, doc.ID, dto.DocStatusPDFFailed)
		}
	}

	return nil
}

func (s *fnDocumentActionService) ProcessPDFBatchFailed(ctx context.Context, payload dto.PDFBatchFailedPayload) error {
	pdfJobID, err := uuid.Parse(payload.PDFJobID)
	if err != nil {
		return fmt.Errorf("invalid pdf_job_id: %w", err)
	}

	docs, err := s.docRepo.GetDocumentsByPDFJobID(ctx, pdfJobID)
	if err != nil {
		return fmt.Errorf("error fetching documents: %w", err)
	}

	docIDs := make([]uuid.UUID, 0, len(docs))
	for _, doc := range docs {
		docIDs = append(docIDs, doc.ID)
	}

	return s.docRepo.BulkUpdateStatus(ctx, docIDs, dto.DocStatusPDFFailed)
}

func (s *fnDocumentActionService) GetByID(ctx context.Context, id uuid.UUID) (*dto.DocumentDetailResponse, error) {
	doc, err := s.docRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("error fetching document: %w", err)
	}
	if doc == nil {
		return nil, nil
	}
	return s.toDetailResponse(doc), nil
}

func (s *fnDocumentActionService) GetBySerialCode(ctx context.Context, serialCode string) (*dto.DocumentDetailResponse, error) {
	doc, err := s.docRepo.GetBySerialCode(ctx, serialCode)
	if err != nil {
		return nil, fmt.Errorf("error fetching document: %w", err)
	}
	if doc == nil {
		return nil, nil
	}
	return s.toDetailResponse(doc), nil
}

func (s *fnDocumentActionService) List(ctx context.Context, params dto.DocumentListQuery) ([]dto.DocumentListItem, int64, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize <= 0 {
		params.PageSize = 10
	}
	if params.PageSize > 100 {
		params.PageSize = 100
	}

	docs, total, err := s.docRepo.List(ctx, params)
	if err != nil {
		return nil, 0, fmt.Errorf("error listing documents: %w", err)
	}

	items := make([]dto.DocumentListItem, 0, len(docs))
	for _, doc := range docs {
		item := dto.DocumentListItem{
			ID:                     doc.ID,
			SerialCode:             doc.SerialCode,
			VerificationCode:       doc.VerificationCode,
			Status:                 doc.Status,
			DigitalSignatureStatus: doc.DigitalSignatureStatus,
			IssueDate:              doc.IssueDate,
			CreatedAt:              doc.CreatedAt.Format(time.RFC3339),
			UpdatedAt:              doc.UpdatedAt.Format(time.RFC3339),
			UserDetailID:           doc.UserDetailID,
			PDFJobID:               doc.PdfJobID,
			HasPDF:                 len(doc.PDFs) > 0,
		}

		if doc.UserDetail.ID != uuid.Nil {
			item.UserDetailName = doc.UserDetail.FirstName + " " + doc.UserDetail.LastName
			item.UserDetailNationalID = doc.UserDetail.NationalID
		}

		if doc.EventID != nil && doc.Event != nil {
			item.EventID = doc.EventID
			item.EventTitle = &doc.Event.Title
		}

		if doc.TemplateID != nil && doc.Template != nil {
			item.TemplateID = doc.TemplateID
			item.TemplateName = &doc.Template.Name
		}

		items = append(items, item)
	}

	return items, total, nil
}

// -- helper methods

func (s *fnDocumentActionService) generateSerialCode(ctx context.Context, event *models.Event) (string, error) {
	year := time.Now().Year()
	prefix := fmt.Sprintf("%s-%d-", event.CertificateSeries, year)
	if event.CertificateSeries == "" {
		prefix = fmt.Sprintf("DOC-%d-", year)
	}

	nextNum, err := s.docRepo.GetNextSerialNumber(ctx, prefix)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s%06d", prefix, nextNum), nil
}

func (s *fnDocumentActionService) generateVerificationCode() string {
	bytes := make([]byte, 16)
	_, _ = rand.Read(bytes)
	return strings.ToUpper(hex.EncodeToString(bytes))
}

func (s *fnDocumentActionService) canGeneratePDF(status string) bool {
	validStatuses := []string{
		dto.DocStatusCreated,
		dto.DocStatusRenew,
		dto.DocStatusPDFFailed,
	}
	for _, s := range validStatuses {
		if status == s {
			return true
		}
	}
	return false
}

func (s *fnDocumentActionService) canTransitionTo(currentStatus, targetStatus string) bool {
	allowed, ok := dto.AllowedStatusTransitions[currentStatus]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == targetStatus {
			return true
		}
	}
	return false
}

func (s *fnDocumentActionService) toDetailResponse(doc *models.Document) *dto.DocumentDetailResponse {
	resp := &dto.DocumentDetailResponse{
		ID:                     doc.ID,
		SerialCode:             doc.SerialCode,
		VerificationCode:       doc.VerificationCode,
		Status:                 doc.Status,
		DigitalSignatureStatus: doc.DigitalSignatureStatus,
		RequiredSignatures:     doc.RequiredSignatures,
		SignedSignatures:       doc.SignedSignatures,
		IssueDate:              doc.IssueDate,
		SignedAt:               doc.SignedAt,
		PDFJobID:               doc.PdfJobID,
		CreatedBy:              doc.CreatedBy,
		CreatedAt:              doc.CreatedAt,
		UpdatedAt:              doc.UpdatedAt,
		UserDetail: dto.UserDetailEmbedded{
			ID:         doc.UserDetail.ID,
			NationalID: doc.UserDetail.NationalID,
			FirstName:  doc.UserDetail.FirstName,
			LastName:   doc.UserDetail.LastName,
			Email:      doc.UserDetail.Email,
			Phone:      doc.UserDetail.Phone,
		},
		PDFs: make([]dto.DocumentPDFResponse, 0),
	}

	if doc.Event != nil {
		resp.Event = &dto.EventEmbedded{
			ID:    doc.Event.ID,
			Code:  doc.Event.Code,
			Title: doc.Event.Title,
		}
	}

	if doc.Template != nil {
		resp.Template = &dto.DocumentTemplateEmbedded{
			ID:   doc.Template.ID,
			Code: doc.Template.Code,
			Name: doc.Template.Name,
		}
	}

	for _, pdf := range doc.PDFs {
		resp.PDFs = append(resp.PDFs, dto.DocumentPDFResponse{
			ID:              pdf.ID,
			Stage:           pdf.Stage,
			Version:         pdf.Version,
			FileName:        pdf.FileName,
			FileID:          pdf.FileID,
			FileHash:        pdf.FileHash,
			FileSizeBytes:   pdf.FileSizeBytes,
			StorageProvider: pdf.StorageProvider,
			CreatedAt:       pdf.CreatedAt,
		})
	}

	return resp
}