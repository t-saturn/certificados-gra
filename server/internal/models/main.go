package models

import (
	"time"

	"github.com/google/uuid"
)

// CORE: USERS & USER DETAILS

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

	// Relations with study / evaluations module
	Evaluations      []Evaluation      `gorm:"foreignKey:UserID"`
	StudyAnnotations []StudyAnnotation `gorm:"foreignKey:UserID"`
	StudyProgresses  []StudyProgress   `gorm:"foreignKey:UserID"`
}

func (User) TableName() string { return "users" }

// UserDetail = certificate beneficiary (may or may not have an account)
type UserDetail struct {
	ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	NationalID string    `gorm:"size:20;not null;uniqueIndex"`
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
	NotificationType *string   `gorm:"size:50"`
	IsRead           bool      `gorm:"not null;default:false"`
	ReadAt           *time.Time
	CreatedAt        time.Time `gorm:"not null"`

	User User `gorm:"foreignKey:UserID"`
}

func (Notification) TableName() string { return "notifications" }

// DOCUMENT TYPES, CATEGORIES & TEMPLATES

type DocumentType struct {
	ID uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`

	Code        string    `gorm:"size:50;not null;uniqueIndex"`
	Name        string    `gorm:"size:100;not null"`
	Description *string   `gorm:"type:text"`
	IsActive    bool      `gorm:"not null;default:true"`
	CreatedAt   time.Time `gorm:"not null"`
	UpdatedAt   time.Time `gorm:"not null"`

	// Solo esto:
	Categories        []DocumentCategory `gorm:"foreignKey:DocumentTypeID"`
	DocumentTemplates []DocumentTemplate `gorm:"foreignKey:DocumentTypeID"`
}

func (DocumentType) TableName() string { return "document_types" }

// EXCEPTION: numeric autoincrement categories
type DocumentCategory struct {
	ID             uint      `gorm:"primaryKey;autoIncrement"`
	DocumentTypeID uuid.UUID `gorm:"type:uuid;not null;index"`

	Code      string    `gorm:"size:50;not null;default:''"`
	Name      string    `gorm:"size:100;not null"`
	IsActive  bool      `gorm:"not null;default:true"`
	CreatedAt time.Time `gorm:"not null"`
	UpdatedAt time.Time `gorm:"not null"`

	DocumentType      DocumentType       `gorm:"foreignKey:DocumentTypeID"`
	DocumentTemplates []DocumentTemplate `gorm:"foreignKey:CategoryID"`
}

func (DocumentCategory) TableName() string { return "document_categories" }

type DocumentTemplateField struct {
	ID uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`

	TemplateID uuid.UUID `gorm:"type:uuid;not null;index:idx_tpl_field_key,unique"`
	Key        string    `gorm:"size:120;not null;index:idx_tpl_field_key,unique"` // ej: "NOMBRE_PARTICIPANTE"
	Label      string    `gorm:"size:200;not null"`
	FieldType  string    `gorm:"size:30;not null;default:'text'"`
	Required   bool      `gorm:"not null;default:false"`

	CreatedAt time.Time `gorm:"not null"`
	UpdatedAt time.Time `gorm:"not null"`

	Template DocumentTemplate `gorm:"foreignKey:TemplateID;constraint:OnDelete:CASCADE"`
}

func (DocumentTemplateField) TableName() string { return "document_template_fields" }

type DocumentTemplate struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Code           string    `gorm:"size:50;not null;default:''"`
	Name           string    `gorm:"size:150;not null"`
	DocumentTypeID uuid.UUID `gorm:"type:uuid;not null;index"`
	CategoryID     *uint     `gorm:"index"`
	FileID         uuid.UUID `gorm:"type:uuid;not null"`
	PrevFileID     uuid.UUID `gorm:"type:uuid;not null"`

	IsActive  bool       `gorm:"not null;default:true"`
	CreatedBy *uuid.UUID `gorm:"type:uuid;index"`
	CreatedAt time.Time  `gorm:"not null"`
	UpdatedAt time.Time  `gorm:"not null"`

	DocumentType DocumentType            `gorm:"foreignKey:DocumentTypeID"`
	Fields       []DocumentTemplateField `gorm:"foreignKey:TemplateID"`
	Category     *DocumentCategory       `gorm:"foreignKey:CategoryID"`
	User         *User                   `gorm:"foreignKey:CreatedBy"`
	Documents    []Document              `gorm:"foreignKey:TemplateID"`
	Events       []Event                 `gorm:"foreignKey:TemplateID"`
}

func (DocumentTemplate) TableName() string { return "document_templates" }

// EVENTS & SCHEDULES

type Event struct {
	ID                      uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	IsPublic                bool      `gorm:"not null;default:true"`
	Code                    string    `gorm:"size:100;not null;default:'';index"`
	CertificateSeries       string    `gorm:"size:50;not null;default:''"`
	OrganizationalUnitsPath string    `gorm:"size:255;not null;default:''"`
	Title                   string    `gorm:"size:200;not null"`
	Description             *string   `gorm:"type:text"`

	TemplateID          *uuid.UUID `gorm:"type:uuid;index"`
	Location            string     `gorm:"size:200;not null"`
	MaxParticipants     *int
	RegistrationOpenAt  *time.Time
	RegistrationCloseAt *time.Time

	Status    string    `gorm:"size:50;not null;default:'SCHEDULED'"`
	CreatedBy uuid.UUID `gorm:"type:uuid;not null;index"` // User (organizer/admin)
	CreatedAt time.Time `gorm:"not null"`
	UpdatedAt time.Time `gorm:"not null"`

	Template          *DocumentTemplate  `gorm:"foreignKey:TemplateID"`
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
	RegistrationSource *string   `gorm:"size:50"`
	RegistrationStatus string    `gorm:"size:50;not null;default:'REGISTERED'"`
	AttendanceStatus   string    `gorm:"size:50;not null;default:'PENDING'"`
	CreatedAt          time.Time `gorm:"not null"`
	UpdatedAt          time.Time `gorm:"not null"`

	Event      Event      `gorm:"foreignKey:EventID"`
	UserDetail UserDetail `gorm:"foreignKey:UserDetailID"`
}

func (EventParticipant) TableName() string { return "event_participants" }

// DOCUMENTS & PDF STORAGE

type Document struct {
	ID           uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserDetailID uuid.UUID  `gorm:"type:uuid;not null;index"`
	EventID      *uuid.UUID `gorm:"type:uuid;index"`
	TemplateID   *uuid.UUID `gorm:"type:uuid;index"`

	SerialCode             string    `gorm:"size:100;not null;uniqueIndex"`
	VerificationCode       string    `gorm:"size:100;not null;uniqueIndex"`
	HashValue              string    `gorm:"size:255;not null"`
	QRText                 *string   `gorm:"size:255"`
	IssueDate              time.Time `gorm:"not null"`
	SignedAt               *time.Time
	DigitalSignatureStatus string    `gorm:"size:50;not null;default:'PENDING'"`
	Status                 string    `gorm:"size:50;not null;default:'ISSUED'"`
	CreatedBy              uuid.UUID `gorm:"type:uuid;not null;index"`
	CreatedAt              time.Time `gorm:"not null"`
	UpdatedAt              time.Time `gorm:"not null"`

	UserDetail    UserDetail        `gorm:"foreignKey:UserDetailID"`
	Event         *Event            `gorm:"foreignKey:EventID"`
	Template      *DocumentTemplate `gorm:"foreignKey:TemplateID"`
	CreatedByUser User              `gorm:"foreignKey:CreatedBy"`

	PDFs        []DocumentPDF `gorm:"foreignKey:DocumentID"`
	Evaluations []Evaluation  `gorm:"foreignKey:DocumentID"`
}

func (Document) TableName() string { return "documents" }

type DocumentPDF struct {
	ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	DocumentID uuid.UUID `gorm:"type:uuid;not null;index"`

	Stage           string    `gorm:"size:50;not null"`
	Version         int       `gorm:"not null;default:1"`
	FileName        string    `gorm:"size:255;not null"`
	FileID          uuid.UUID `gorm:"type:uuid;not null"`
	FileHash        string    `gorm:"size:255;not null"`
	FileSizeBytes   *int64
	StorageProvider *string `gorm:"size:100"`

	CreatedAt time.Time `gorm:"not null"`
}

func (DocumentPDF) TableName() string { return "document_pdfs" }

// EVALUATIONS

type Evaluation struct {
	ID         uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID     uuid.UUID  `gorm:"type:uuid;not null;index"`
	DocumentID *uuid.UUID `gorm:"type:uuid;index"`

	Title       string    `gorm:"type:text;not null"`
	Description *string   `gorm:"type:text"`
	Status      string    `gorm:"size:20;not null;default:'pending'"`
	CreatedAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
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
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EvaluationID uuid.UUID `gorm:"type:uuid;not null;index"`

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

	AdminVerdict string    `gorm:"size:20"`
	Score        float64   `gorm:"type:numeric(5,2)"`
	Remarks      *string   `gorm:"type:text"`
	ReviewedAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`

	Evaluation Evaluation         `gorm:"foreignKey:EvaluationID"`
	Question   EvaluationQuestion `gorm:"foreignKey:QuestionID"`
}

func (EvaluationScore) TableName() string { return "evaluation_scores" }

type EvaluationDoc struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	EvaluationID uuid.UUID `gorm:"type:uuid;not null;index"`

	MarkdownContent string    `gorm:"type:text"`
	GeneratedAt     time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`

	Evaluation Evaluation `gorm:"foreignKey:EvaluationID"`
}

func (EvaluationDoc) TableName() string { return "evaluation_docs" }

// STUDY MATERIALS / REINFORCEMENT

type StudyMaterial struct {
	ID uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`

	Title       string    `gorm:"type:text;not null"`
	Description *string   `gorm:"type:text"`
	CreatedAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt   time.Time

	Sections []StudySection `gorm:"foreignKey:MaterialID"`
}

func (StudyMaterial) TableName() string { return "study_materials" }

type StudySection struct {
	ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	MaterialID uuid.UUID `gorm:"type:uuid;not null;index"`

	Title       string  `gorm:"type:text;not null"`
	Description *string `gorm:"type:text"`
	OrderIndex  *int
	CreatedAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`

	Material    StudyMaterial     `gorm:"foreignKey:MaterialID"`
	Subsections []StudySubsection `gorm:"foreignKey:SectionID"`
}

func (StudySection) TableName() string { return "study_sections" }

type StudySubsection struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	SectionID uuid.UUID `gorm:"type:uuid;not null;index"`

	Title       string  `gorm:"type:text;not null"`
	Description *string `gorm:"type:text"`
	VideoURL    *string `gorm:"type:text"`
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

	FileName  string    `gorm:"type:text"`
	FileURL   string    `gorm:"type:text"`
	FileType  string    `gorm:"size:50"` // pdf, xlsx, zip, etc.
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`

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
