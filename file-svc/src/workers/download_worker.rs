use std::sync::Arc;

use tracing::{error, info, instrument, warn};
use uuid::Uuid;

use crate::error::Result;
use crate::events::Subjects;
use crate::state::AppState;

/// Worker for processing download events
pub struct DownloadWorker;

impl DownloadWorker {
    #[instrument(skip_all, fields(subject = %subject))]
    pub async fn handle(
        state: &Arc<AppState>,
        subject: &str,
        payload: &serde_json::Value,
    ) -> Result<()> {
        match subject {
            Subjects::DOWNLOAD_REQUESTED => {
                info!("Processing download.requested event");

                if let Some(event) = payload.get("payload") {
                    let file_id_str = event
                        .get("file_id")
                        .and_then(|v| v.as_str())
                        .unwrap_or_default();

                    let job_id_str = event
                        .get("job_id")
                        .and_then(|v| v.as_str())
                        .unwrap_or_default();

                    let user_id = event
                        .get("user_id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("anonymous");

                    info!(
                        file_id = %file_id_str,
                        job_id = %job_id_str,
                        user_id = %user_id,
                        "Download requested - processing"
                    );

                    // Parse UUIDs
                    let file_id = match Uuid::parse_str(file_id_str) {
                        Ok(id) => id,
                        Err(e) => {
                            error!(file_id = %file_id_str, error = %e, "Invalid file_id UUID");
                            return Ok(());
                        }
                    };

                    let job_id = match Uuid::parse_str(job_id_str) {
                        Ok(id) => id,
                        Err(e) => {
                            error!(job_id = %job_id_str, error = %e, "Invalid job_id UUID");
                            return Ok(());
                        }
                    };

                    // Process the download request
                    let download_service = state.download_service();

                    match download_service
                        .download_with_content(job_id, &file_id, user_id)
                        .await
                    {
                        Ok(()) => {
                            info!(
                                file_id = %file_id,
                                job_id = %job_id,
                                "Download request processed successfully"
                            );
                        }
                        Err(e) => {
                            error!(
                                file_id = %file_id,
                                job_id = %job_id,
                                error = %e,
                                "Failed to process download request"
                            );
                        }
                    }
                } else {
                    warn!("Download requested event missing payload");
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
