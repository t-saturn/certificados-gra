use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// File information returned from the file server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub id: Uuid,
    pub original_name: String,
    pub size: u64,
    pub mime_type: String,
    pub is_public: bool,
    pub created_at: DateTime<Utc>,
}

/// File metadata for internal use
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub file_id: Uuid,
    pub original_name: String,
    pub size: u64,
    pub mime_type: String,
    pub is_public: bool,
    pub project_id: String,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub download_url: Option<String>,
}

impl FileMetadata {
    pub fn from_file_info(info: FileInfo, project_id: String, user_id: String) -> Self {
        Self {
            file_id: info.id,
            original_name: info.original_name,
            size: info.size,
            mime_type: info.mime_type,
            is_public: info.is_public,
            project_id,
            user_id,
            created_at: info.created_at,
            download_url: None,
        }
    }

    pub fn with_download_url(mut self, url: String) -> Self {
        self.download_url = Some(url);
        self
    }
}
