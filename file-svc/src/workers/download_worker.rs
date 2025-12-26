use std::sync::Arc;

use tracing::{info, instrument};

use crate::error::Result;
use crate::events::Subjects;
use crate::state::AppState;

/// Worker for processing download events
pub struct DownloadWorker;

impl DownloadWorker {
    #[instrument(skip(state, payload), fields(subject = %subject))]
    pub async fn handle(
        _state: &Arc<AppState>,
        subject: &str,
        payload: &serde_json::Value,
    ) -> Result<()> {
        match subject {
            Subjects::DOWNLOAD_REQUESTED => {
                info!("Processing download.requested event");
                if let Some(event) = payload.get("payload") {
                    info!(
                        file_id = ?event.get("file_id"),
                        project_id = ?event.get("project_id"),
                        user_id = ?event.get("user_id"),
                        "Download requested"
                    );
                }
            }
            Subjects::DOWNLOAD_COMPLETED => {
                info!("Processing download.completed event");
                if let Some(event) = payload.get("payload") {
                    info!(
                        file_id = ?event.get("file_id"),
                        file_name = ?event.get("file_name"),
                        file_size = ?event.get("file_size"),
                        "Download completed"
                    );
                }
            }
            Subjects::DOWNLOAD_FAILED => {
                info!("Processing download.failed event");
                if let Some(event) = payload.get("payload") {
                    info!(
                        file_id = ?event.get("file_id"),
                        error_code = ?event.get("error_code"),
                        error_message = ?event.get("error_message"),
                        "Download failed"
                    );
                }
            }
            _ => {
                info!("Unknown download event: {}", subject);
            }
        }

        Ok(())
    }
}
