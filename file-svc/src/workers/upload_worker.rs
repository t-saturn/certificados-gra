use std::sync::Arc;

use tracing::{info, instrument};

use crate::error::Result;
use crate::events::Subjects;
use crate::state::AppState;

/// Worker for processing upload events
pub struct UploadWorker;

impl UploadWorker {
    #[instrument(skip(state, payload), fields(subject = %subject))]
    pub async fn handle(
        _state: &Arc<AppState>,
        subject: &str,
        payload: &serde_json::Value,
    ) -> Result<()> {
        match subject {
            Subjects::UPLOAD_REQUESTED => {
                info!("Processing upload.requested event");
                // Log for other microservices to react
                if let Some(event) = payload.get("payload") {
                    info!(
                        project_id = ?event.get("project_id"),
                        user_id = ?event.get("user_id"),
                        file_name = ?event.get("file_name"),
                        "Upload requested"
                    );
                }
            }
            Subjects::UPLOAD_COMPLETED => {
                info!("Processing upload.completed event");
                if let Some(event) = payload.get("payload") {
                    info!(
                        file_id = ?event.get("file_id"),
                        file_name = ?event.get("file_name"),
                        download_url = ?event.get("download_url"),
                        "Upload completed"
                    );
                }
            }
            Subjects::UPLOAD_FAILED => {
                info!("Processing upload.failed event");
                if let Some(event) = payload.get("payload") {
                    info!(
                        error_code = ?event.get("error_code"),
                        error_message = ?event.get("error_message"),
                        "Upload failed"
                    );
                }
            }
            _ => {
                info!("Unknown upload event: {}", subject);
            }
        }

        Ok(())
    }
}
