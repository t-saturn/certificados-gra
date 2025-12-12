package services

import (
	"context"
	"errors"
	"math"
	"strings"
	"time"

	"server/internal/dto"
	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CertificateService interface {
	ListCertificates(ctx context.Context, in dto.ListCertificatesQuery) (dto.CertificateListResponse, error)
	GetCertificateByID(ctx context.Context, id uuid.UUID) (models.Document, error)
}

type certificateServiceImpl struct {
	db *gorm.DB
}

func NewCertificateService(db *gorm.DB) CertificateService {
	return &certificateServiceImpl{db: db}
}

func normalizeSignatureStatus(s string) string {
	s = strings.TrimSpace(strings.ToLower(s))
	if s == "" || s == "all" {
		return ""
	}
	return strings.ToUpper(s)
}

func mapStateLabel(signatureStatus string) string {
	switch strings.ToUpper(strings.TrimSpace(signatureStatus)) {
	case "SIGNED":
		return "LISTO"
	case "PENDING", "PARTIALLY_SIGNED":
		return "PENDIENTE"
	case "ERROR":
		return "ERROR"
	default:
		return signatureStatus
	}
}

func (s *certificateServiceImpl) ListCertificates(ctx context.Context, in dto.ListCertificatesQuery) (dto.CertificateListResponse, error) {
	page := in.Page
	if page <= 0 {
		page = 1
	}
	pageSize := in.PageSize
	if pageSize <= 0 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	search := strings.TrimSpace(in.SearchQuery)
	signatureStatus := normalizeSignatureStatus(in.SignatureStatus)

	// --------- Filtro opcional por usuario (user_id) => national_id ----------
	var userNationalID string
	if in.UserID != nil {
		var u models.User
		if err := s.db.WithContext(ctx).First(&u, "id = ?", *in.UserID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return dto.CertificateListResponse{}, errors.New("user not found")
			}
			return dto.CertificateListResponse{}, err
		}
		userNationalID = u.NationalID
		if userNationalID == "" {
			return dto.CertificateListResponse{}, errors.New("user has no national_id set")
		}
	}

	// --------- BASE QUERY ----------
	base := s.db.WithContext(ctx).Model(&models.Document{})

	// filtro por event_id
	if in.EventID != nil {
		base = base.Where("event_id = ?", *in.EventID)
	}

	// filtro por signature status
	if signatureStatus != "" {
		base = base.Where("digital_signature_status = ?", signatureStatus)
	}

	// filtro por user_id -> user_details.national_id
	if userNationalID != "" {
		subUserDetails := s.db.WithContext(ctx).
			Table("user_details").
			Select("id").
			Where("national_id = ?", userNationalID)

		base = base.Where("user_detail_id IN (?)", subUserDetails)
	}

	// búsqueda (serial, verification, participante, evento, plantilla, tipo doc)
	if search != "" {
		like := "%" + search + "%"

		// subquery user_details por nombre/apellido/dni
		subUserDetails := s.db.WithContext(ctx).
			Table("user_details").
			Select("id").
			Where("national_id ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ?", like, like, like)

		// subquery events por title/code
		subEvents := s.db.WithContext(ctx).
			Table("events").
			Select("id").
			Where("title ILIKE ? OR code ILIKE ?", like, like)

		// subquery templates por name/code
		subTemplates := s.db.WithContext(ctx).
			Table("document_templates").
			Select("id").
			Where("name ILIKE ? OR code ILIKE ?", like, like)

		// subquery document_types por name/code (a través de templates)
		subDocTypes := s.db.WithContext(ctx).
			Table("document_types").
			Select("id").
			Where("name ILIKE ? OR code ILIKE ?", like, like)

		// templates que pertenecen a esos document_types (para filtrar por tipo)
		subTemplatesByDocType := s.db.WithContext(ctx).
			Table("document_templates").
			Select("id").
			Where("document_type_id IN (?)", subDocTypes)

		base = base.Where(`
			(serial_code ILIKE ? OR verification_code ILIKE ?
			OR user_detail_id IN (?)
			OR event_id IN (?)
			OR template_id IN (?)
			OR template_id IN (?))
		`, like, like, subUserDetails, subEvents, subTemplates, subTemplatesByDocType)
	}

	// --------- TOTAL ----------
	var total int64
	if err := base.Count(&total).Error; err != nil {
		return dto.CertificateListResponse{}, err
	}

	totalPages := 0
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(pageSize)))
	}

	hasPrev := page > 1
	hasNext := int64(page*pageSize) < total

	// --------- IDs paginados ----------
	var docIDs []uuid.UUID
	if total > 0 {
		if err := base.
			Select("id").
			Order("created_at DESC").
			Limit(pageSize).
			Offset(offset).
			Scan(&docIDs).Error; err != nil {
			return dto.CertificateListResponse{}, err
		}
	}

	if len(docIDs) == 0 {
		return dto.CertificateListResponse{
			Items: []dto.CertificateListItem{},
			Pagination: dto.Pagination{
				Page:        page,
				PageSize:    pageSize,
				TotalItems:  total,
				TotalPages:  totalPages,
				HasPrevPage: hasPrev,
				HasNextPage: hasNext,
			},
			Filters: dto.CertificateListFilters{
				SearchQuery:     search,
				SignatureStatus: in.SignatureStatus,
				EventID:         in.EventID,
				UserID:          in.UserID,
			},
		}, nil
	}

	// --------- Cargar completos con relaciones ----------
	var docs []models.Document
	if err := s.db.WithContext(ctx).
		Preload("UserDetail").
		Preload("Event").
		Preload("Template").
		Preload("Template.DocumentType").
		Preload("PDFs").
		Where("id IN ?", docIDs).
		Order("created_at DESC").
		Find(&docs).Error; err != nil {
		return dto.CertificateListResponse{}, err
	}

	// --------- Map a DTO ----------
	items := make([]dto.CertificateListItem, 0, len(docs))

	for _, d := range docs {
		fullName := strings.TrimSpace(d.UserDetail.FirstName + " " + d.UserDetail.LastName)

		var evID *uuid.UUID
		var evCode, evTitle *string
		if d.Event != nil {
			evID = &d.Event.ID
			evCode = &d.Event.Code
			evTitle = &d.Event.Title
		}

		var tplID *uuid.UUID
		var tplCode, tplName *string
		var dtID *uuid.UUID
		var dtCode, dtName *string

		if d.Template != nil {
			tplID = &d.Template.ID
			tplCode = &d.Template.Code
			tplName = &d.Template.Name

			// DocumentType viene por Template.DocumentType
			dtID = &d.Template.DocumentType.ID
			dtCode = &d.Template.DocumentType.Code
			dtName = &d.Template.DocumentType.Name
		}

		fileIDs := make([]uuid.UUID, 0, len(d.PDFs))
		for _, pdf := range d.PDFs {
			fileIDs = append(fileIDs, pdf.FileID)
		}

		issueISO := d.IssueDate.Format(time.RFC3339)
		var signedISO *string
		if d.SignedAt != nil {
			s := d.SignedAt.Format(time.RFC3339)
			signedISO = &s
		}

		items = append(items, dto.CertificateListItem{
			ID:               d.ID,
			SerialCode:       d.SerialCode,
			VerificationCode: d.VerificationCode,
			Status:           d.Status,
			SignatureStatus:  d.DigitalSignatureStatus,
			StateLabel:       mapStateLabel(d.DigitalSignatureStatus),
			IssueDate:        issueISO,
			SignedAt:         signedISO,
			Event: dto.CertificateEventSummary{
				ID:    evID,
				Code:  evCode,
				Title: evTitle,
			},
			Participant: dto.CertificateParticipant{
				ID:         d.UserDetail.ID,
				NationalID: d.UserDetail.NationalID,
				FirstName:  d.UserDetail.FirstName,
				LastName:   d.UserDetail.LastName,
				FullName:   fullName,
			},
			TemplateID:       tplID,
			TemplateCode:     tplCode,
			TemplateName:     tplName,
			DocumentTypeID:   dtID,
			DocumentTypeCode: dtCode,
			DocumentTypeName: dtName,
			FileIDs:          fileIDs,
		})
	}

	return dto.CertificateListResponse{
		Items: items,
		Pagination: dto.Pagination{
			Page:        page,
			PageSize:    pageSize,
			TotalItems:  total,
			TotalPages:  totalPages,
			HasPrevPage: hasPrev,
			HasNextPage: hasNext,
		},
		Filters: dto.CertificateListFilters{
			SearchQuery:     search,
			SignatureStatus: in.SignatureStatus,
			EventID:         in.EventID,
			UserID:          in.UserID,
		},
	}, nil
}

func (s *certificateServiceImpl) GetCertificateByID(ctx context.Context, id uuid.UUID) (models.Document, error) {
	var doc models.Document
	if err := s.db.WithContext(ctx).
		Preload("UserDetail").
		Preload("Event").
		Preload("Event.Schedules").
		Preload("Template").
		Preload("Template.DocumentType").
		Preload("Template.Category").
		Preload("Template.Category.DocumentType").
		Preload("PDFs").
		Preload("CreatedByUser").
		Preload("Evaluations").
		Preload("Evaluations.Questions").
		Preload("Evaluations.Answers").
		Preload("Evaluations.Scores").
		Preload("Evaluations.Docs").
		First(&doc, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.Document{}, errors.New("certificate not found")
		}
		return models.Document{}, err
	}

	return doc, nil
}
