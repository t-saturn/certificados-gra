mod upload;
mod download;

pub use upload::{UploadCompleted, UploadFailed, UploadRequested};
pub use download::{DownloadCompleted, DownloadFailed, DownloadRequested};

use serde::{Deserialize, Serialize};

/// Event envelope for all events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventEnvelope<T: Serialize> {
    pub event_id: String,
    pub event_type: String,
    pub timestamp: String,
    pub source: String,
    pub payload: T,
}

impl<T: Serialize> EventEnvelope<T> {
    pub fn new(event_type: impl Into<String>, payload: T) -> Self {
        Self {
            event_id: uuid::Uuid::new_v4().to_string(),
            event_type: event_type.into(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            source: "file-svc".to_string(),
            payload,
        }
    }
}
