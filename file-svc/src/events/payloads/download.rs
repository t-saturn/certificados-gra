use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Payload for download.requested event
/// NOTE: project_id is NOT required - file-svc uses its own from config
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadRequested {
    pub job_id: Uuid,
    pub file_id: Uuid,
    pub user_id: String,
}

/// Payload for download.completed event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadCompleted {
    pub job_id: Uuid,
    pub file_id: Uuid,
    pub project_id: String,
    pub user_id: String,
    pub file_name: String,
    pub file_size: u64,
    pub mime_type: String,
    pub download_url: String,
    /// Base64 encoded file content (optional, for event-driven downloads)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_base64: Option<String>,
}

/// Payload for download.failed event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadFailed {
    pub job_id: Uuid,
    pub file_id: Uuid,
    pub project_id: String,
    pub user_id: String,
    pub error_code: String,
    pub error_message: String,
}
