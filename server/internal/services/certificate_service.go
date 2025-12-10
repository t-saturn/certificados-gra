package services

import (
	"context"
	"errors"
	"strings"

	"server/internal/dto"
	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CertificateService interface {
	// Devuelve: certificados (Document con relaciones) + filtros de paginado
	ListCertificates(ctx context.Context, in dto.ListCertificatesQuery) ([]models.Document, dto.CertificateListFilters, error)
}

type certificateServiceImpl struct {
	db *gorm.DB
}

func NewCertificateService(db *gorm.DB) CertificateService {
	return &certificateServiceImpl{db: db}
}

func (s *certificateServiceImpl) ListCertificates(ctx context.Context, in dto.ListCertificatesQuery) ([]models.Document, dto.CertificateListFilters, error) {
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

	statusFilter := strings.TrimSpace(strings.ToLower(in.Status))
	var statusValue string
	if statusFilter == "" || statusFilter == "all" {
		statusValue = ""
	} else {
		statusValue = strings.ToUpper(statusFilter) // issued, generated → ISSUED, GENERATED
	}

	// --------- Filtro opcional por usuario (user_id) ----------
	var userNationalID string
	if in.UserID != nil {
		var user models.User
		if err := s.db.WithContext(ctx).
			First(&user, "id = ?", *in.UserID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, dto.CertificateListFilters{}, errors.New("user not found")
			}
			return nil, dto.CertificateListFilters{}, err
		}
		userNationalID = user.NationalID
		if userNationalID == "" {
			return nil, dto.CertificateListFilters{}, errors.New("user has no national_id set")
		}
	}

	// --------- BASE SIN JOINS: sobre documents ---------
	base := s.db.WithContext(ctx).Model(&models.Document{})

	// Filtro por user_id → por national_id usando subquery en user_details
	if userNationalID != "" {
		subUserDetails := s.db.WithContext(ctx).
			Table("user_details").
			Select("id").
			Where("national_id = ?", userNationalID)

		base = base.Where("user_detail_id IN (?)", subUserDetails)
	}

	// Filtro por status
	if statusValue != "" {
		base = base.Where("status = ?", statusValue)
	}

	// Filtro por nombre del certificado:
	// - nombre de la plantilla (document_templates.name)
	// - nombre del tipo de documento (document_types.name)
	if search != "" {
		like := "%" + search + "%"

		subDocTypes := s.db.WithContext(ctx).
			Table("document_types").
			Select("id").
			Where("name ILIKE ?", like)

		subTemplates := s.db.WithContext(ctx).
			Table("document_templates").
			Select("id").
			Where("name ILIKE ?", like)

		base = base.Where(
			"(document_type_id IN (?) OR template_id IN (?))",
			subDocTypes, subTemplates,
		)
	}

	// --------- TOTAL ----------
	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, dto.CertificateListFilters{}, err
	}

	if total == 0 {
		filters := dto.CertificateListFilters{
			Page:        page,
			PageSize:    pageSize,
			Total:       0,
			HasNextPage: false,
			HasPrevPage: page > 1,
			SearchQuery: search,
			// Status:      statusFilterOrAll(statusFilter),
		}
		return []models.Document{}, filters, nil
	}

	// --------- IDs de la página ----------
	var docIDs []uuid.UUID
	if err := base.
		Select("id").
		Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Scan(&docIDs).Error; err != nil {
		return nil, dto.CertificateListFilters{}, err
	}

	if len(docIDs) == 0 {
		filters := dto.CertificateListFilters{
			Page:        page,
			PageSize:    pageSize,
			Total:       total,
			HasNextPage: false,
			HasPrevPage: page > 1,
			SearchQuery: search,
			// Status:      statusFilterOrAll(statusFilter),
		}
		return []models.Document{}, filters, nil
	}

	// --------- Cargar documentos completos con relaciones ---------
	var documents []models.Document
	if err := s.db.WithContext(ctx).
		Preload("DocumentType").
		Preload("Template").
		Preload("Event").
		Preload("UserDetail").
		Preload("PDF").
		Preload("CreatedByUser").
		Where("id IN ?", docIDs).
		Order("created_at DESC").
		Find(&documents).Error; err != nil {
		return nil, dto.CertificateListFilters{}, err
	}

	hasNext := int64(page*pageSize) < total
	hasPrev := page > 1

	filters := dto.CertificateListFilters{
		Page:        page,
		PageSize:    pageSize,
		Total:       total,
		HasNextPage: hasNext,
		HasPrevPage: hasPrev,
		SearchQuery: search,
		// Status:      statusFilterOrAll(statusFilter),
	}

	return documents, filters, nil
}
