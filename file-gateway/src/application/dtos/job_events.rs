use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadRequestedEvent {
    pub job_id: String,
    pub user_id: String,
    pub is_public: bool,
    pub filename: String,
    pub content_type: String,
    pub content_base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadCompletedEvent {
    pub job_id: String,
    pub file_id: String,
    pub original_name: String,
    pub size: u64,
    pub mime_type: String,
    pub is_public: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadFailedEvent {
    pub job_id: String,
    pub code: String,
    pub message: String,
}
