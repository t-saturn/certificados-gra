use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Job types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum JobType {
    Upload,
    Download,
}

/// Job status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum JobStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

/// File job for queue processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileJob {
    pub id: Uuid,
    pub job_type: JobType,
    pub status: JobStatus,
    pub file_id: Option<Uuid>,
    pub project_id: String,
    pub user_id: String,
    pub payload: serde_json::Value,
    pub error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl FileJob {
    pub fn new_upload(project_id: String, user_id: String, payload: serde_json::Value) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            job_type: JobType::Upload,
            status: JobStatus::Pending,
            file_id: None,
            project_id,
            user_id,
            payload,
            error: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn new_download(file_id: Uuid, project_id: String, user_id: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            job_type: JobType::Download,
            status: JobStatus::Pending,
            file_id: Some(file_id),
            project_id,
            user_id,
            payload: serde_json::json!({}),
            error: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn mark_processing(&mut self) {
        self.status = JobStatus::Processing;
        self.updated_at = Utc::now();
    }

    pub fn mark_completed(&mut self, file_id: Option<Uuid>) {
        self.status = JobStatus::Completed;
        self.file_id = file_id;
        self.updated_at = Utc::now();
    }

    pub fn mark_failed(&mut self, error: String) {
        self.status = JobStatus::Failed;
        self.error = Some(error);
        self.updated_at = Utc::now();
    }
}
