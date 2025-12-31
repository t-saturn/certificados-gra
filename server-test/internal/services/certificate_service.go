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

// --- SOLO 3 estados ---
func normalizeDocStatus(s string) string {
	s = strings.TrimSpace(strings.ToUpper(s))
	if s == "" || strings.EqualFold(s, "all") {
		return ""
	}
	switch s {
	case "CREATED", "GENERATED", "REJECTED":
		return s
	default:
		return "" // o error, si quieres ser estricto
	}
}

func mapStateLabelFromStatus(status string) string {
	switch strings.ToUpper(strings.TrimSpace(status)) {
	case "GENERATED":
		return "LISTO"
	case "REJECTED":
		return "RECHAZADO"
	case "CREATED":
		fallthrough
	default:
		return "PENDIENTE"
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
	eventQuery := strings.TrimSpace(in.EventQuery)

	// NUEVO: status solo 3 valores
	statusValue := normalizeDocStatus(in.Status) // <-- requiere que agregues Status en DTO query (ver nota abajo)

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

	// IMPORTANT: limitar a solo estos estados cuando no venga status
	// para que no aparezcan otros estados históricos en BD
	base = base.Where("status IN ?", []string{"CREATED", "GENERATED", "REJECTED"})

	// filtro por status específico
	if statusValue != "" {
		base = base.Where("status = ?", statusValue)
	}

	// filtro por event_id
	if in.EventID != nil {
		base = base.Where("event_id = ?", *in.EventID)
	}

	// filtro por national_id (DNI) directo
	if in.NationalID != nil && strings.TrimSpace(*in.NationalID) != "" {
		dni := strings.TrimSpace(*in.NationalID)
		subUserDetailsByDNI := s.db.WithContext(ctx).
			Table("user_details").
			Select("id").
			Where("national_id = ?", dni)

		base = base.Where("user_detail_id IN (?)", subUserDetailsByDNI)
	}

	// filtro por user_id (vía national_id del user autenticado)
	if userNationalID != "" {
		subUserDetails := s.db.WithContext(ctx).
			Table("user_details").
			Select("id").
			Where("national_id = ?", userNationalID)

		base = base.Where("user_detail_id IN (?)", subUserDetails)
	}

	// búsqueda por PARTICIPANTE (nombre/apellido/dni)
	if search != "" {
		like := "%" + search + "%"

		subUserDetails := s.db.WithContext(ctx).
			Table("user_details").
			Select("id").
			Where("national_id ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ?", like, like, like)

		base = base.Where("user_detail_id IN (?)", subUserDetails)
	}

	// filtro por EVENTO (title/code) vía event_query
	if eventQuery != "" {
		like := "%" + eventQuery + "%"
		subEvents := s.db.WithContext(ctx).
			Table("events").
			Select("id").
			Where("title ILIKE ? OR code ILIKE ?", like, like)

		base = base.Where("event_id IN (?)", subEvents)
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
				SearchQuery: search,
				EventQuery:  eventQuery,
				Status:      in.Status, // <-- requiere agregar Status en filters DTO
				EventID:     in.EventID,
				UserID:      in.UserID,
				NationalID:  in.NationalID,
			},
		}, nil
	}

	// --------- Cargar docs con relaciones ----------
	var docs []models.Document
	if err := s.db.WithContext(ctx).
		Preload("UserDetail").
		Preload("Event").
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

		issueISO := d.IssueDate.Format(time.RFC3339)
		var signedISO *string
		if d.SignedAt != nil {
			si := d.SignedAt.Format(time.RFC3339)
			signedISO = &si
		}

		pdfs := make([]dto.CertificatePDFItem, 0, len(d.PDFs))
		var previewFileID *uuid.UUID
		for _, p := range d.PDFs {
			pdfs = append(pdfs, dto.CertificatePDFItem{
				ID:       p.ID,
				Stage:    p.Stage,
				Version:  p.Version,
				FileID:   p.FileID,
				FileName: p.FileName,
				FileHash: p.FileHash,
			})

			// preview: si hay "final" usarlo, si no el primero
			if previewFileID == nil {
				tmp := p.FileID
				previewFileID = &tmp
			}
			if strings.EqualFold(p.Stage, "final") {
				tmp := p.FileID
				previewFileID = &tmp
			}
		}

		items = append(items, dto.CertificateListItem{
			ID:               d.ID,
			SerialCode:       d.SerialCode,
			VerificationCode: d.VerificationCode,
			Status:           d.Status,
			// SignatureStatus:  "", // si aún existe el campo en DTO lo puedes dejar vacío
			StateLabel: mapStateLabelFromStatus(d.Status),
			IssueDate:  issueISO,
			SignedAt:   signedISO,
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
			PDFs:          pdfs,
			PreviewFileID: previewFileID,
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
			SearchQuery: search,
			EventQuery:  eventQuery,
			Status:      in.Status,
			EventID:     in.EventID,
			UserID:      in.UserID,
			NationalID:  in.NationalID,
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
