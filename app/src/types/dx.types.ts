// -- dx api types

// -- common types
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// -- users
export interface User {
  id: string;
  email: string;
  keycloak_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  keycloak_id: string;
}

export interface UpdateUserInput {
  email?: string;
}

// -- user details
export interface UserDetail {
  id: string;
  national_id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserDetailInput {
  national_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface UpdateUserDetailInput {
  first_name?: string;
  last_name?: string;
}

// -- document types
export interface DocumentType {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentTypeInput {
  code: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateDocumentTypeInput {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// -- document categories
export interface DocumentCategory {
  id: number;
  document_type_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentCategoryInput {
  document_type_id: string;
  name: string;
  description?: string;
}

export interface UpdateDocumentCategoryInput {
  name?: string;
  description?: string;
}

// -- document templates
export interface DocumentTemplate {
  id: string;
  document_type_id: string;
  category_id?: number;
  name: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentTemplateInput {
  document_type_id: string;
  category_id?: number;
  name: string;
  content: string;
  is_active?: boolean;
}

export interface UpdateDocumentTemplateInput {
  name?: string;
  content?: string;
  is_active?: boolean;
}

// -- documents
export interface Document {
  id: string;
  user_detail_id: string;
  event_id: string;
  template_id: string;
  serial_code: string;
  verification_code: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentInput {
  user_detail_id: string;
  event_id: string;
  template_id: string;
  serial_code: string;
  verification_code: string;
}

export interface UpdateDocumentInput {
  serial_code?: string;
  verification_code?: string;
}

// -- events
export type EventStatus = 'draft' | 'published' | 'active' | 'completed' | 'cancelled';

export interface Event {
  id: string;
  code: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: EventStatus;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEventInput {
  code: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status?: EventStatus;
  is_public?: boolean;
}

export interface UpdateEventInput {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: EventStatus;
  is_public?: boolean;
}

// -- event participants
export type ParticipantStatus = 'registered' | 'attended' | 'completed' | 'cancelled';

export interface EventParticipant {
  id: string;
  event_id: string;
  user_detail_id: string;
  status: ParticipantStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateEventParticipantInput {
  event_id: string;
  user_detail_id: string;
  status?: ParticipantStatus;
}

export interface UpdateEventParticipantInput {
  status?: ParticipantStatus;
}

// -- notifications
export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationInput {
  user_id: string;
  title: string;
  message: string;
  type?: NotificationType;
}

// -- evaluations
export interface Evaluation {
  id: string;
  user_id: string;
  document_id: string;
  title: string;
  score: number;
  max_score: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEvaluationInput {
  user_id: string;
  document_id: string;
  title: string;
  score: number;
  max_score: number;
}

export interface UpdateEvaluationInput {
  score?: number;
  max_score?: number;
}

// -- study materials
export type StudyMaterialType = 'pdf' | 'video' | 'article' | 'quiz';

export interface StudyMaterial {
  id: string;
  title: string;
  description?: string;
  content: string;
  type: StudyMaterialType;
  created_at: string;
  updated_at: string;
}

export interface CreateStudyMaterialInput {
  title: string;
  description?: string;
  content: string;
  type: StudyMaterialType;
}

export interface UpdateStudyMaterialInput {
  title?: string;
  description?: string;
  content?: string;
  type?: StudyMaterialType;
}
