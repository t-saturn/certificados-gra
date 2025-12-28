use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Payload for upload.requested event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadRequested {
    pub job_id: Uuid,
    pub project_id: String,
    pub user_id: String,
    pub file_name: String,
    pub file_size: u64,
    pub mime_type: String,
    pub is_public: bool,
}

/// Payload for upload.completed event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadCompleted {
    pub job_id: Uuid,
    pub file_id: Uuid,
    pub project_id: String,
    pub user_id: String,
    pub file_name: String,
    pub file_size: u64,
    pub mime_type: String,
    pub is_public: bool,
    pub download_url: String,
}

/// Payload for upload.failed event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadFailed {
    pub job_id: Uuid,
    pub project_id: String,
    pub user_id: String,
    pub file_name: String,
    pub error_code: String,
    pub error_message: String,
}
