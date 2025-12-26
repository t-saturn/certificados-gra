use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Payload for download.requested event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadRequested {
    pub job_id: Uuid,
    pub file_id: Uuid,
    pub project_id: String,
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
    pub download_url: String,
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
