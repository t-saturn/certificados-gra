package models

import "time"

// USER (SSO-linked)
type User struct {
	ID         string    `gorm:"type:uuid;primaryKey"` // UUID
	Email      string    `gorm:"size:150;not null;uniqueIndex"`
	NationalID string    `gorm:"size:20;not null;uniqueIndex"` // DNI from SSO
	CreatedAt  time.Time `gorm:"not null"`
	UpdatedAt  time.Time `gorm:"not null"`

	Notifications     []Notification     `gorm:"foreignKey:UserID"`
	DocumentTemplates []DocumentTemplate `gorm:"foreignKey:CreatedBy"`
	Events            []Event            `gorm:"foreignKey:CreatedBy"`
	Documents         []Document         `gorm:"foreignKey:CreatedBy"`
}

func (User) TableName() string { return "users" }

// USER DETAILS (beneficiario)
type UserDetail struct {
	ID         string    `gorm:"type:uuid;primaryKey"`         // UUID
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
	ID               string  `gorm:"type:uuid;primaryKey"` // UUID
	UserID           string  `gorm:"type:uuid;not null;index"`
	Title            string  `gorm:"size:200;not null"`
	Body             string  `gorm:"type:text;not null"`
	NotificationType *string `gorm:"size:50"` // e.g. EVENT, DOCUMENT
	IsRead           bool    `gorm:"not null;default:false"`
	ReadAt           *time.Time
	CreatedAt        time.Time `gorm:"not null"`

	User User `gorm:"foreignKey:UserID"`
}

func (Notification) TableName() string { return "notifications" }

// DOCUMENT TYPES, CATEGORIES & TEMPLATES

type DocumentType struct {
	ID          string    `gorm:"type:uuid;primaryKey"`         // UUID
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

// ⚠️ Categorías se queda con ID numérico autoincremental
type DocumentCategory struct {
	ID          uint      `gorm:"primaryKey;autoIncrement"` // excepción: no UUID
	Name        string    `gorm:"size:100;not null"`
	Description *string   `gorm:"type:text"`
	IsActive    bool      `gorm:"not null;default:true"`
	CreatedAt   time.Time `gorm:"not null"`
	UpdatedAt   time.Time `gorm:"not null"`

	DocumentTemplates []DocumentTemplate `gorm:"foreignKey:CategoryID"`
}

func (DocumentCategory) TableName() string { return "document_categories" }

type DocumentTemplate struct {
	ID             string    `gorm:"type:uuid;primaryKey"` // UUID
	Name           string    `gorm:"size:150;not null"`
	Description    *string   `gorm:"type:text"`
	DocumentTypeID string    `gorm:"type:uuid;not null;index"`
	CategoryID     *uint     `gorm:"index"`             // referencia a DocumentCategory (uint)
	FilePath       string    `gorm:"size:255;not null"` // template path or URL
	IsActive       bool      `gorm:"not null;default:true"`
	CreatedBy      *string   `gorm:"type:uuid;index"` // User ID (UUID)
	CreatedAt      time.Time `gorm:"not null"`
	UpdatedAt      time.Time `gorm:"not null"`

	DocumentType DocumentType      `gorm:"foreignKey:DocumentTypeID"`
	Category     *DocumentCategory `gorm:"foreignKey:CategoryID"`
	User         *User             `gorm:"foreignKey:CreatedBy"`
	Documents    []Document        `gorm:"foreignKey:TemplateID"`
}

func (DocumentTemplate) TableName() string { return "document_templates" }

// EVENTS & SCHEDULES

type Event struct {
	ID                  string  `gorm:"type:uuid;primaryKey"` // UUID
	Title               string  `gorm:"size:200;not null"`
	Description         *string `gorm:"type:text"`
	DocumentTypeID      string  `gorm:"type:uuid;not null;index"`
	Location            string  `gorm:"size:200;not null"`
	MaxParticipants     *int
	RegistrationOpenAt  *time.Time
	RegistrationCloseAt *time.Time
	Status              string    `gorm:"size:50;not null;default:'PLANNED'"`
	CreatedBy           string    `gorm:"type:uuid;not null;index"` // User (organizer/admin)
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
	ID            string    `gorm:"type:uuid;primaryKey"` // UUID
	EventID       string    `gorm:"type:uuid;not null;index"`
	StartDatetime time.Time `gorm:"not null"`
	EndDatetime   time.Time `gorm:"not null"`
	CreatedAt     time.Time `gorm:"not null"`

	Event Event `gorm:"foreignKey:EventID"`
}

func (EventSchedule) TableName() string { return "event_schedules" }

type EventParticipant struct {
	ID                 string    `gorm:"type:uuid;primaryKey"` // UUID
	EventID            string    `gorm:"type:uuid;not null;index:idx_event_userdetail,unique"`
	UserDetailID       string    `gorm:"type:uuid;not null;index:idx_event_userdetail,unique"`
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
	ID                     string    `gorm:"type:uuid;primaryKey"` // UUID
	UserDetailID           string    `gorm:"type:uuid;not null;index"`
	EventID                *string   `gorm:"type:uuid;index"` // nullable for ad-hoc documents
	DocumentTypeID         string    `gorm:"type:uuid;not null;index"`
	TemplateID             *string   `gorm:"type:uuid;index"`
	SerialCode             string    `gorm:"size:100;not null;uniqueIndex"`
	VerificationCode       string    `gorm:"size:100;not null;uniqueIndex"`
	HashValue              string    `gorm:"size:255;not null"`
	QRText                 *string   `gorm:"size:255"`
	QRImagePath            *string   `gorm:"size:255"`
	IssueDate              time.Time `gorm:"not null"` // date only, but stored as time.Time
	SignedAt               *time.Time
	DigitalSignatureStatus string    `gorm:"size:50;not null;default:'PENDING'"` // PENDING, SIGNED, FAILED
	Status                 string    `gorm:"size:50;not null;default:'ISSUED'"`  // ISSUED, REVOKED, REPLACED
	CreatedBy              string    `gorm:"type:uuid;not null;index"`           // User who issued
	CreatedAt              time.Time `gorm:"not null"`
	UpdatedAt              time.Time `gorm:"not null"`

	UserDetail    UserDetail        `gorm:"foreignKey:UserDetailID"`
	Event         *Event            `gorm:"foreignKey:EventID"`
	DocumentType  DocumentType      `gorm:"foreignKey:DocumentTypeID"`
	Template      *DocumentTemplate `gorm:"foreignKey:TemplateID"`
	CreatedByUser User              `gorm:"foreignKey:CreatedBy"`
	PDF           DocumentPDF       `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;foreignKey:DocumentID"`
}

func (Document) TableName() string { return "documents" }

type DocumentPDF struct {
	ID              string `gorm:"type:uuid;primaryKey"` // UUID
	DocumentID      string `gorm:"type:uuid;not null;uniqueIndex"`
	FileName        string `gorm:"size:255;not null"`
	FilePath        string `gorm:"size:255;not null"`
	FileHash        string `gorm:"size:255;not null"`
	FileSizeBytes   *int64
	StorageProvider *string   `gorm:"size:100"`
	CreatedAt       time.Time `gorm:"not null"`
}

func (DocumentPDF) TableName() string { return "document_pdfs" }
