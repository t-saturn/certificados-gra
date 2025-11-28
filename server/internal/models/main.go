package models

import (
	"time"

	"github.com/google/uuid"
)

// CORE: USERS & USER DETAILS

// User = usuario autenticado vía SSO
type User struct {
	ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Email      string    `gorm:"size:150;not null;uniqueIndex"`
	NationalID string    `gorm:"size:20;not null;uniqueIndex"` // DNI from SSO
	CreatedAt  time.Time `gorm:"not null"`
	UpdatedAt  time.Time `gorm:"not null"`

	Notifications     []Notification     `gorm:"foreignKey:UserID"`
	DocumentTemplates []DocumentTemplate `gorm:"foreignKey:CreatedBy"`
	Events            []Event            `gorm:"foreignKey:CreatedBy"`
	Documents         []Document         `gorm:"foreignKey:CreatedBy"`

	// Relaciones con módulo de estudio / evaluaciones
	Evaluations      []Evaluation      `gorm:"foreignKey:UserID"`
	StudyAnnotations []StudyAnnotation `gorm:"foreignKey:UserID"`
	StudyProgresses  []StudyProgress   `gorm:"foreignKey:UserID"`
}

func (User) TableName() string { return "users" }

// UserDetail = beneficiario de certificados (puede o no tener cuenta)
type UserDetail struct {
	ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	NationalID string    `gorm:"size:20;not null;uniqueIndex"` // DNI
	FirstName  string    `gorm:"size:100;not null"`
	LastName   string    `gorm:"size:100;not null"`
	Phone      *string   `gorm:"size:30"`
	Email      *string   `gorm:"size:150"`
	CreatedAt  time.Time `gorm:"not null"`
	UpdatedAt  time.Time `gorm:"not null"`

	Documents         []Document         `gorm:"foreignKey:UserDetailID"`
	EventParticipants []EventParticipant `gorm:"foreignKey:UserDetailID"`
}

func (UserDetail) TableName() string { return "user_details" }

// NOTIFICATIONS

type Notification struct {
	ID               uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID           uuid.UUID `gorm:"type:uuid;not null;index"`
	Title            string    `gorm:"size:200;not null"`
	Body             string    `gorm:"type:text;not null"`
	NotificationType *string   `gorm:"size:50"` // e.g. EVENT, DOCUMENT
	IsRead           bool      `gorm:"not null;default:false"`
	ReadAt           *time.Time
	CreatedAt        time.Time `gorm:"not null"`

	User User `gorm:"foreignKey:UserID"`
}

func (Notification) TableName() string { return "notifications" }

// DOCUMENT TYPES, CATEGORIES & TEMPLATES

type DocumentType struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Code        string    `gorm:"size:50;not null;uniqueIndex"` // CERTIFICATE, CONSTANCY, RECOGNITION
	Name        string    `gorm:"size:100;not null"`
	Description *string   `gorm:"type:text"`
	IsActive    bool      `gorm:"not null;default:true"`
	CreatedAt   time.Time `gorm:"not null"`
	UpdatedAt   time.Time `gorm:"not null"`

	Events            []Event            `gorm:"foreignKey:DocumentTypeID"`
	DocumentTemplates []DocumentTemplate `gorm:"foreignKey:DocumentTypeID"`
	Documents         []Document         `gorm:"foreignKey:DocumentTypeID"`
}

func (DocumentType) TableName() string { return "document_types" }

// EXCEPCIÓN: Categorías numéricas autoincrementales
type DocumentCategory struct {
	ID             uint      `gorm:"primaryKey;autoIncrement"`
	DocumentTypeID uuid.UUID `gorm:"type:uuid;not null;index"` // a qué tipo pertenece
	Name           string    `gorm:"size:100;not null"`
	Description    *string   `gorm:"type:text"`
	IsActive       bool      `gorm:"not null;default:true"`
	CreatedAt      time.Time `gorm:"not null"`
	UpdatedAt      time.Time `gorm:"not null"`

	DocumentType      DocumentType       `gorm:"foreignKey:DocumentTypeID"`
	DocumentTemplates []DocumentTemplate `gorm:"foreignKey:CategoryID"`
}

func (DocumentCategory) TableName() string { return "document_categories" }

type DocumentTemplate struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Name           string    `gorm:"size:150;not null"`
	Description    *string   `gorm:"type:text"`
	DocumentTypeID uuid.UUID `gorm:"type:uuid;not null;index"`
	CategoryID     *uint     `gorm:"index"` // FK a DocumentCategory

	// ID del archivo en tu servidor de archivos (no guardas URL)
	FileID uuid.UUID `gorm:"type:uuid;not null"`

	IsActive  bool       `gorm:"not null;default:true"`
	CreatedBy *uuid.UUID `gorm:"type:uuid;index"` // User ID
	CreatedAt time.Time  `gorm:"not null"`
	UpdatedAt time.Time  `gorm:"not null"`

	DocumentType DocumentType      `gorm:"foreignKey:DocumentTypeID"`
	Category     *DocumentCategory `gorm:"foreignKey:CategoryID"`
	User         *User             `gorm:"foreignKey:CreatedBy"`
	Documents    []Document        `gorm:"foreignKey:TemplateID"`
}

func (DocumentTemplate) TableName() string { return "document_templates" }

// EVENTS & SCHEDULES

type Event struct {
	ID                  uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Title               string    `gorm:"size:200;not null"`
	Description         *string   `gorm:"type:text"`
	DocumentTypeID      uuid.UUID `gorm:"type:uuid;not null;index"`
	Location            string    `gorm:"size:200;not null"`
	MaxParticipants     *int
	RegistrationOpenAt  *time.Time
	RegistrationCloseAt *time.Time
	Status              string    `gorm:"size:50;not null;default:'PLANNED'"`
	CreatedBy           uuid.UUID `gorm:"type:uuid;not null;index"` // User (organizer/admin)
	CreatedAt           time.Time `gorm:"not null"`
	UpdatedAt           time.Time `gorm:"not null"`

	DocumentType      DocumentType       `gorm:"foreignKey:DocumentTypeID"`
	User              User               `gorm:"foreignKey:CreatedBy"`
	Schedules         []EventSchedule    `gorm:"foreignKey:EventID"`
	EventParticipants []EventParticipant `gorm:"foreignKey:EventID"`
	Documents         []Document         `gorm:"foreignKey:EventID"`
}

func (Event) TableName() string { return "events" }

type EventSchedule struct {
	ID            uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EventID       uuid.UUID `gorm:"type:uuid;not null;index"`
	StartDatetime time.Time `gorm:"not null"`
	EndDatetime   time.Time `gorm:"not null"`
	CreatedAt     time.Time `gorm:"not null"`

	Event Event `gorm:"foreignKey:EventID"`
}

func (EventSchedule) TableName() string { return "event_schedules" }

type EventParticipant struct {
	ID                 uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EventID            uuid.UUID `gorm:"type:uuid;not null;index:idx_event_userdetail,unique"`
	UserDetailID       uuid.UUID `gorm:"type:uuid;not null;index:idx_event_userdetail,unique"`
	RegistrationSource *string   `gorm:"size:50"`                               // SELF, IMPORTED, ADMIN
	RegistrationStatus string    `gorm:"size:50;not null;default:'REGISTERED'"` // REGISTERED, WAITLIST, CANCELLED
	AttendanceStatus   string    `gorm:"size:50;not null;default:'PENDING'"`    // PRESENT, ABSENT, PENDING
	CreatedAt          time.Time `gorm:"not null"`
	UpdatedAt          time.Time `gorm:"not null"`

	Event      Event      `gorm:"foreignKey:EventID"`
	UserDetail UserDetail `gorm:"foreignKey:UserDetailID"`
}

func (EventParticipant) TableName() string { return "event_participants" }

// DOCUMENTS & PDF STORAGE

type Document struct {
	ID                     uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserDetailID           uuid.UUID  `gorm:"type:uuid;not null;index"`
	EventID                *uuid.UUID `gorm:"type:uuid;index"` // nullable for ad-hoc documents
	DocumentTypeID         uuid.UUID  `gorm:"type:uuid;not null;index"`
	TemplateID             *uuid.UUID `gorm:"type:uuid;index"`
	SerialCode             string     `gorm:"size:100;not null;uniqueIndex"`
	VerificationCode       string     `gorm:"size:100;not null;uniqueIndex"`
	HashValue              string     `gorm:"size:255;not null"`
	QRText                 *string    `gorm:"size:255"`
	QRImagePath            *string    `gorm:"size:255"`
	IssueDate              time.Time  `gorm:"not null"` // date only, but stored as time.Time
	SignedAt               *time.Time
	DigitalSignatureStatus string    `gorm:"size:50;not null;default:'PENDING'"` // PENDING, SIGNED, FAILED
	Status                 string    `gorm:"size:50;not null;default:'ISSUED'"`  // ISSUED, REVOKED, REPLACED
	CreatedBy              uuid.UUID `gorm:"type:uuid;not null;index"`           // User who issued
	CreatedAt              time.Time `gorm:"not null"`
	UpdatedAt              time.Time `gorm:"not null"`

	UserDetail    UserDetail        `gorm:"foreignKey:UserDetailID"`
	Event         *Event            `gorm:"foreignKey:EventID"`
	DocumentType  DocumentType      `gorm:"foreignKey:DocumentTypeID"`
	Template      *DocumentTemplate `gorm:"foreignKey:TemplateID"`
	CreatedByUser User              `gorm:"foreignKey:CreatedBy"`
	PDF           *DocumentPDF      `gorm:"foreignKey:DocumentID"`

	// Relaciones con evaluaciones / estudio
	Evaluations []Evaluation `gorm:"foreignKey:DocumentID"`
}

func (Document) TableName() string { return "documents" }

type DocumentPDF struct {
	ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	DocumentID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex"`
	FileName   string    `gorm:"size:255;not null"`

	// ID del archivo PDF en tu servidor de archivos
	FileID uuid.UUID `gorm:"type:uuid;not null"`

	FileHash        string `gorm:"size:255;not null"`
	FileSizeBytes   *int64
	StorageProvider *string   `gorm:"size:100"`
	CreatedAt       time.Time `gorm:"not null"`
}

func (DocumentPDF) TableName() string { return "document_pdfs" }

// EVALUATIONS

type Evaluation struct {
	ID          uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID      uuid.UUID  `gorm:"type:uuid;not null;index"`
	DocumentID  *uuid.UUID `gorm:"type:uuid;index"` // evaluación asociada a un documento (cert / constancia / etc.)
	Title       string     `gorm:"type:text;not null"`
	Description *string    `gorm:"type:text"`
	Status      string     `gorm:"size:20;not null;default:'pending'"` // pending, answered, reviewed
	CreatedAt   time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt   time.Time

	User      User                 `gorm:"foreignKey:UserID"`
	Document  *Document            `gorm:"foreignKey:DocumentID"`
	Questions []EvaluationQuestion `gorm:"foreignKey:EvaluationID"`
	Answers   []EvaluationAnswer   `gorm:"foreignKey:EvaluationID"`
	Scores    []EvaluationScore    `gorm:"foreignKey:EvaluationID"`
	Docs      []EvaluationDoc      `gorm:"foreignKey:EvaluationID"`
}

func (Evaluation) TableName() string { return "evaluations" }

type EvaluationQuestion struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EvaluationID   uuid.UUID `gorm:"type:uuid;not null;index"`
	QuestionNumber int       `gorm:"not null"`
	QuestionText   string    `gorm:"type:text;not null"`
	MaxScore       float64   `gorm:"type:numeric(5,2);default:1"`
	CreatedAt      time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`

	Evaluation Evaluation         `gorm:"foreignKey:EvaluationID"`
	Answers    []EvaluationAnswer `gorm:"foreignKey:QuestionID"`
	Scores     []EvaluationScore  `gorm:"foreignKey:QuestionID"`
}

func (EvaluationQuestion) TableName() string { return "evaluation_questions" }

type EvaluationAnswer struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EvaluationID uuid.UUID `gorm:"type:uuid;not null;index"`
	QuestionID   uuid.UUID `gorm:"type:uuid;not null;index"`
	ResponseText string    `gorm:"type:text"`
	CreatedAt    time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`

	Evaluation Evaluation         `gorm:"foreignKey:EvaluationID"`
	Question   EvaluationQuestion `gorm:"foreignKey:QuestionID"`
}

func (EvaluationAnswer) TableName() string { return "evaluation_answers" }

type EvaluationScore struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EvaluationID uuid.UUID `gorm:"type:uuid;not null;index"`
	QuestionID   uuid.UUID `gorm:"type:uuid;not null;index"`
	AdminVerdict string    `gorm:"size:20"` // correct, incorrect, partial
	Score        float64   `gorm:"type:numeric(5,2)"`
	Remarks      *string   `gorm:"type:text"`
	ReviewedAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`

	Evaluation Evaluation         `gorm:"foreignKey:EvaluationID"`
	Question   EvaluationQuestion `gorm:"foreignKey:QuestionID"`
}

func (EvaluationScore) TableName() string { return "evaluation_scores" }

type EvaluationDoc struct {
	ID              uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EvaluationID    uuid.UUID `gorm:"type:uuid;not null;index"`
	MarkdownContent string    `gorm:"type:text"`
	GeneratedAt     time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`

	Evaluation Evaluation `gorm:"foreignKey:EvaluationID"`
}

func (EvaluationDoc) TableName() string { return "evaluation_docs" }

// STUDY MATERIALS / REFORCEMENT

type StudyMaterial struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Title       string    `gorm:"type:text;not null"`
	Description *string   `gorm:"type:text"`
	CreatedAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt   time.Time

	Sections []StudySection `gorm:"foreignKey:MaterialID"`
}

func (StudyMaterial) TableName() string { return "study_materials" }

type StudySection struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	MaterialID  uuid.UUID `gorm:"type:uuid;not null;index"`
	Title       string    `gorm:"type:text;not null"`
	Description *string   `gorm:"type:text"`
	OrderIndex  *int
	CreatedAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`

	Material    StudyMaterial     `gorm:"foreignKey:MaterialID"`
	Subsections []StudySubsection `gorm:"foreignKey:SectionID"`
}

func (StudySection) TableName() string { return "study_sections" }

type StudySubsection struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	SectionID   uuid.UUID `gorm:"type:uuid;not null;index"`
	Title       string    `gorm:"type:text;not null"`
	Description *string   `gorm:"type:text"`
	VideoURL    *string   `gorm:"type:text"`
	OrderIndex  *int
	CreatedAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`

	Section    StudySection      `gorm:"foreignKey:SectionID"`
	Resources  []StudyResource   `gorm:"foreignKey:SubsectionID"`
	Notes      []StudyAnnotation `gorm:"foreignKey:SubsectionID"`
	Progresses []StudyProgress   `gorm:"foreignKey:SubsectionID"`
}

func (StudySubsection) TableName() string { return "study_subsections" }

type StudyResource struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	SubsectionID uuid.UUID `gorm:"type:uuid;not null;index"`
	FileName     string    `gorm:"type:text"`
	FileURL      string    `gorm:"type:text"`
	FileType     string    `gorm:"size:50"` // pdf, xlsx, zip, etc.
	CreatedAt    time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`

	Subsection StudySubsection `gorm:"foreignKey:SubsectionID"`
}

func (StudyResource) TableName() string { return "study_resources" }

type StudyAnnotation struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID       uuid.UUID `gorm:"type:uuid;not null;index"`
	SubsectionID uuid.UUID `gorm:"type:uuid;not null;index"`
	Content      string    `gorm:"type:text"`
	CreatedAt    time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt    time.Time

	User       User            `gorm:"foreignKey:UserID"`
	Subsection StudySubsection `gorm:"foreignKey:SubsectionID"`
}

func (StudyAnnotation) TableName() string { return "study_annotations" }

type StudyProgress struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID       uuid.UUID `gorm:"type:uuid;not null;index"`
	SubsectionID uuid.UUID `gorm:"type:uuid;not null;index"`
	Completed    bool      `gorm:"not null;default:false"`
	CompletedAt  *time.Time

	User       User            `gorm:"foreignKey:UserID"`
	Subsection StudySubsection `gorm:"foreignKey:SubsectionID"`
}

func (StudyProgress) TableName() string { return "study_progress" }
