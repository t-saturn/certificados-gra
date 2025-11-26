package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// BaseModel contiene los campos comunes de auditoría
type BaseModel struct {
	CreatedAt time.Time  `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt *time.Time `json:"updated_at,omitempty"`
	CreatedBy int        `gorm:"not null" json:"created_by"`
	UpdatedBy *int       `json:"updated_by,omitempty"`
}

// Role representa un rol del sistema
type Role struct {
	RoleID      int     `gorm:"primaryKey;column:role_id;autoIncrement" json:"role_id"`
	Code        string  `gorm:"type:varchar(30);uniqueIndex;not null" json:"code"`
	Name        string  `gorm:"type:varchar(80);not null" json:"name"`
	Description *string `gorm:"type:text" json:"description,omitempty"`
	IsActive    bool    `gorm:"default:true" json:"is_active"`
	BaseModel

	// Relaciones
	Users []User `gorm:"many2many:fn_user_roles;foreignKey:RoleID;joinForeignKey:RoleID;References:UserID;joinReferences:UserID" json:"users,omitempty"`
}

func (Role) TableName() string {
	return "fn_roles"
}

// User representa un usuario del sistema
type User struct {
	UserID             int        `gorm:"primaryKey;column:user_id;autoIncrement" json:"user_id"`
	SSOUserID          *uuid.UUID `gorm:"type:uuid;uniqueIndex" json:"sso_user_id,omitempty"`
	FullName           string     `gorm:"type:varchar(150);not null" json:"full_name"`
	InstitutionalEmail *string    `gorm:"type:varchar(150);uniqueIndex" json:"institutional_email,omitempty"`
	IsActive           bool       `gorm:"default:true" json:"is_active"`
	CreatedAt          time.Time  `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt          *time.Time `json:"updated_at,omitempty"`
	CreatedBy          *int       `json:"created_by,omitempty"`
	UpdatedBy          *int       `json:"updated_by,omitempty"`

	// Relaciones
	Roles            []Role              `gorm:"many2many:fn_user_roles;foreignKey:UserID;joinForeignKey:UserID;References:RoleID;joinReferences:RoleID" json:"roles,omitempty"`
	CreatedPeople    []Person            `gorm:"foreignKey:CreatedBy" json:"-"`
	CreatedTemplates []Template          `gorm:"foreignKey:CreatedBy" json:"-"`
	CreatedEvents    []Event             `gorm:"foreignKey:CreatedBy" json:"-"`
	CreatedDocuments []Document          `gorm:"foreignKey:CreatedBy" json:"-"`
	IssuedDocuments  []Document          `gorm:"foreignKey:IssuedBy" json:"-"`
	Signatures       []DocumentSignature `gorm:"foreignKey:UserID" json:"-"`
	AuditLogs        []AuditLog          `gorm:"foreignKey:UserID" json:"-"`
}

func (User) TableName() string {
	return "fn_users"
}

// UserRole representa la relación entre usuarios y roles
type UserRole struct {
	UserID     int       `gorm:"primaryKey;not null" json:"user_id"`
	RoleID     int       `gorm:"primaryKey;not null" json:"role_id"`
	AssignedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"assigned_at"`
	AssignedBy *int      `json:"assigned_by,omitempty"`

	// Relaciones
	User     User  `gorm:"foreignKey:UserID;references:UserID" json:"user,omitempty"`
	Role     Role  `gorm:"foreignKey:RoleID;references:RoleID" json:"role,omitempty"`
	Assigner *User `gorm:"foreignKey:AssignedBy;references:UserID" json:"assigner,omitempty"`
}

func (UserRole) TableName() string {
	return "fn_user_roles"
}

// Person representa una persona (asistente a eventos)
type Person struct {
	PersonID    int     `gorm:"primaryKey;column:person_id;autoIncrement" json:"person_id"`
	DNI         string  `gorm:"type:varchar(15);uniqueIndex;not null" json:"dni"`
	FirstName   string  `gorm:"type:varchar(100);not null" json:"first_name"`
	LastName    string  `gorm:"type:varchar(100);not null" json:"last_name"`
	Email       *string `gorm:"type:varchar(150)" json:"email,omitempty"`
	Phone       *string `gorm:"type:varchar(20)" json:"phone,omitempty"`
	Institution *string `gorm:"type:varchar(150)" json:"institution,omitempty"`
	Position    *string `gorm:"type:varchar(100)" json:"position,omitempty"`
	BaseModel

	// Relaciones
	EventAttendees []EventAttendee `gorm:"foreignKey:PersonID" json:"event_attendees,omitempty"`
}

func (Person) TableName() string {
	return "fn_people"
}

// DocumentType representa un tipo de documento
type DocumentType struct {
	DocumentTypeID int     `gorm:"primaryKey;column:document_type_id;autoIncrement" json:"document_type_id"`
	Code           string  `gorm:"type:varchar(30);uniqueIndex;not null" json:"code"`
	Name           string  `gorm:"type:varchar(120);not null" json:"name"`
	Description    *string `gorm:"type:text" json:"description,omitempty"`
	IsActive       bool    `gorm:"default:true" json:"is_active"`
	BaseModel

	// Relaciones
	Templates []Template `gorm:"foreignKey:DocumentTypeID" json:"templates,omitempty"`
	Documents []Document `gorm:"foreignKey:DocumentTypeID" json:"documents,omitempty"`
}

func (DocumentType) TableName() string {
	return "fn_document_types"
}

// Template representa una plantilla de documento
type Template struct {
	TemplateID     int     `gorm:"primaryKey;column:template_id;autoIncrement" json:"template_id"`
	DocumentTypeID int     `gorm:"not null" json:"document_type_id"`
	Name           string  `gorm:"type:varchar(150);not null" json:"name"`
	Description    *string `gorm:"type:text" json:"description,omitempty"`
	HTMLContent    string  `gorm:"type:text;not null" json:"html_content"`
	IsActive       bool    `gorm:"default:true" json:"is_active"`
	BaseModel

	// Relaciones
	DocumentType DocumentType `gorm:"foreignKey:DocumentTypeID;references:DocumentTypeID" json:"document_type,omitempty"`
	Events       []Event      `gorm:"many2many:fn_event_templates;foreignKey:TemplateID;joinForeignKey:TemplateID;References:EventID;joinReferences:EventID" json:"events,omitempty"`
}

func (Template) TableName() string {
	return "fn_templates"
}

// Event representa un evento
type Event struct {
	EventID     int        `gorm:"primaryKey;column:event_id;autoIncrement" json:"event_id"`
	EventName   string     `gorm:"type:varchar(200);not null" json:"event_name"`
	Description *string    `gorm:"type:text" json:"description,omitempty"`
	StartDate   time.Time  `gorm:"type:date;not null" json:"start_date"`
	EndDate     *time.Time `gorm:"type:date" json:"end_date,omitempty"`
	Location    *string    `gorm:"type:varchar(150)" json:"location,omitempty"`
	Organizer   *string    `gorm:"type:varchar(150)" json:"organizer,omitempty"`
	IsActive    bool       `gorm:"default:true" json:"is_active"`
	BaseModel

	// Relaciones
	Templates      []Template      `gorm:"many2many:fn_event_templates;foreignKey:EventID;joinForeignKey:EventID;References:TemplateID;joinReferences:TemplateID" json:"templates,omitempty"`
	EventAttendees []EventAttendee `gorm:"foreignKey:EventID" json:"event_attendees,omitempty"`
}

func (Event) TableName() string {
	return "fn_events"
}

// EventTemplate representa la relación entre eventos y plantillas
type EventTemplate struct {
	EventID    int       `gorm:"primaryKey;not null" json:"event_id"`
	TemplateID int       `gorm:"primaryKey;not null" json:"template_id"`
	AssignedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"assigned_at"`
	AssignedBy *int      `json:"assigned_by,omitempty"`

	// Relaciones
	Event    Event    `gorm:"foreignKey:EventID;references:EventID" json:"event,omitempty"`
	Template Template `gorm:"foreignKey:TemplateID;references:TemplateID" json:"template,omitempty"`
	Assigner *User    `gorm:"foreignKey:AssignedBy;references:UserID" json:"assigner,omitempty"`
}

func (EventTemplate) TableName() string {
	return "fn_event_templates"
}

// EventAttendee representa el registro de una persona en un evento
type EventAttendee struct {
	EventAttendeeID int       `gorm:"primaryKey;column:event_attendee_id;autoIncrement" json:"event_attendee_id"`
	EventID         int       `gorm:"not null;uniqueIndex:idx_event_person" json:"event_id"`
	PersonID        int       `gorm:"not null;uniqueIndex:idx_event_person" json:"person_id"`
	Attended        bool      `gorm:"default:true" json:"attended"`
	RegisteredAt    time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"registered_at"`
	RegisteredBy    int       `gorm:"not null" json:"registered_by"`

	// Relaciones
	Event     Event      `gorm:"foreignKey:EventID;references:EventID" json:"event,omitempty"`
	Person    Person     `gorm:"foreignKey:PersonID;references:PersonID" json:"person,omitempty"`
	Registrar User       `gorm:"foreignKey:RegisteredBy;references:UserID" json:"registrar,omitempty"`
	Documents []Document `gorm:"foreignKey:EventAttendeeID" json:"documents,omitempty"`
}

func (EventAttendee) TableName() string {
	return "fn_event_attendees"
}

// Document representa un documento generado
type Document struct {
	DocumentID      int            `gorm:"primaryKey;column:document_id;autoIncrement" json:"document_id"`
	EventAttendeeID int            `gorm:"not null" json:"event_attendee_id"`
	DocumentTypeID  int            `gorm:"not null" json:"document_type_id"`
	DocumentCode    string         `gorm:"type:varchar(40);uniqueIndex;not null" json:"document_code"`
	QRUrl           *string        `gorm:"type:text" json:"qr_url,omitempty"`
	PDFFile         *string        `gorm:"type:text" json:"pdf_file,omitempty"`
	Status          string         `gorm:"type:varchar(30);not null;default:'DRAFT'" json:"status"`
	IssuedAt        *time.Time     `json:"issued_at,omitempty"`
	IssuedBy        *int           `json:"issued_by,omitempty"`
	IssuedByText    *string        `gorm:"type:varchar(200)" json:"issued_by_text,omitempty"`
	Observations    *string        `gorm:"type:text" json:"observations,omitempty"`
	Metadata        datatypes.JSON `gorm:"type:jsonb" json:"metadata,omitempty"`
	BaseModel

	// Relaciones
	EventAttendee EventAttendee       `gorm:"foreignKey:EventAttendeeID;references:EventAttendeeID" json:"event_attendee,omitempty"`
	DocumentType  DocumentType        `gorm:"foreignKey:DocumentTypeID;references:DocumentTypeID" json:"document_type,omitempty"`
	Issuer        *User               `gorm:"foreignKey:IssuedBy;references:UserID" json:"issuer,omitempty"`
	Signatures    []DocumentSignature `gorm:"foreignKey:DocumentID" json:"signatures,omitempty"`
	Details       []DocDetail         `gorm:"foreignKey:DocumentID" json:"details,omitempty"`
}

func (Document) TableName() string {
	return "fn_documents"
}

// DocumentSignature representa una firma de documento
type DocumentSignature struct {
	SignatureID   int       `gorm:"primaryKey;column:signature_id;autoIncrement" json:"signature_id"`
	DocumentID    int       `gorm:"not null" json:"document_id"`
	UserID        *int      `json:"user_id,omitempty"`
	SignerText    *string   `gorm:"type:varchar(200)" json:"signer_text,omitempty"`
	SignatureDate time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"signature_date"`
	SignatureType *string   `gorm:"type:varchar(30)" json:"signature_type,omitempty"`
	DocumentHash  *string   `gorm:"type:text" json:"document_hash,omitempty"`
	IsValid       bool      `gorm:"default:true" json:"is_valid"`
	CreatedAt     time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	CreatedBy     int       `gorm:"not null" json:"created_by"`

	// Relaciones
	Document Document `gorm:"foreignKey:DocumentID;references:DocumentID" json:"document,omitempty"`
	User     *User    `gorm:"foreignKey:UserID;references:UserID" json:"user,omitempty"`
	Creator  User     `gorm:"foreignKey:CreatedBy;references:UserID" json:"creator,omitempty"`
}

func (DocumentSignature) TableName() string {
	return "fn_document_signatures"
}

// DocDetail representa detalles adicionales dinámicos de un documento
type DocDetail struct {
	DetailID   int     `gorm:"primaryKey;column:detail_id;autoIncrement" json:"detail_id"`
	DocumentID int     `gorm:"not null;uniqueIndex:idx_document_key" json:"document_id"`
	Key        string  `gorm:"type:varchar(100);not null;uniqueIndex:idx_document_key" json:"key"`
	Value      *string `gorm:"type:text" json:"value,omitempty"`
	BaseModel

	// Relaciones
	Document Document `gorm:"foreignKey:DocumentID;references:DocumentID" json:"document,omitempty"`
}

func (DocDetail) TableName() string {
	return "fn_doc_details"
}

// AuditLog representa un registro de auditoría del sistema
type AuditLog struct {
	AuditID     int       `gorm:"primaryKey;column:audit_id;autoIncrement" json:"audit_id"`
	UserID      *int      `json:"user_id,omitempty"`
	Action      string    `gorm:"type:varchar(150);not null" json:"action"`
	Entity      *string   `gorm:"type:varchar(80)" json:"entity,omitempty"`
	EntityID    *int      `json:"entity_id,omitempty"`
	Description *string   `gorm:"type:text" json:"description,omitempty"`
	IPAddress   *string   `gorm:"type:varchar(45)" json:"ip_address,omitempty"`
	UserAgent   *string   `gorm:"type:text" json:"user_agent,omitempty"`
	PerformedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"performed_at"`

	// Relaciones
	User *User `gorm:"foreignKey:UserID;references:UserID" json:"user,omitempty"`
}

func (AuditLog) TableName() string {
	return "fn_audit_logs"
}
