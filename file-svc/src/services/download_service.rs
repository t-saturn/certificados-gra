use std::sync::Arc;

use bytes::Bytes;
use tracing::{info, instrument};
use uuid::Uuid;

use crate::error::Result;
use crate::events::{
    DownloadCompleted, DownloadFailed, DownloadRequested, EventPublisher, Subjects,
};
use crate::repositories::traits::FileRepositoryTrait;

/// Download result with file data and metadata
pub struct DownloadResult {
    pub data: Bytes,
    pub content_type: String,
    pub content_disposition: String,
}

/// Service for file downloads
pub struct DownloadService<F>
where
    F: FileRepositoryTrait,
{
    file_repo: Arc<F>,
    event_publisher: EventPublisher,
}

impl<F> DownloadService<F>
where
    F: FileRepositoryTrait,
{
    pub fn new(file_repo: Arc<F>, event_publisher: EventPublisher) -> Self {
        Self {
            file_repo,
            event_publisher,
        }
    }

    /// Get download URL for a file
    pub fn get_download_url(&self, file_id: &Uuid) -> String {
        self.file_repo.get_download_url(file_id)
    }

    /// Download file (proxy mode)
    #[instrument(skip(self))]
    pub async fn download(
        &self,
        file_id: &Uuid,
        project_id: &str,
        user_id: &str,
    ) -> Result<DownloadResult> {
        let job_id = Uuid::new_v4();

        // Publish download.requested event
        let requested_event = DownloadRequested {
            job_id,
            file_id: *file_id,
            project_id: project_id.to_string(),
            user_id: user_id.to_string(),
        };

        self.event_publisher
            .publish(Subjects::DOWNLOAD_REQUESTED, &requested_event)
            .await?;

        // Perform download
        match self.file_repo.download(file_id).await {
            Ok((data, content_type, content_disposition)) => {
                let download_url = self.file_repo.get_download_url(file_id);

                // Extract filename from content-disposition
                let file_name = extract_filename(&content_disposition)
                    .unwrap_or_else(|| file_id.to_string());

                // Publish download.completed event
                let completed_event = DownloadCompleted {
                    job_id,
                    file_id: *file_id,
                    project_id: project_id.to_string(),
                    user_id: user_id.to_string(),
                    file_name,
                    file_size: data.len() as u64,
                    download_url,
                };

                self.event_publisher
                    .publish(Subjects::DOWNLOAD_COMPLETED, &completed_event)
                    .await?;

                info!(
                    file_id = %file_id,
                    job_id = %job_id,
                    size = data.len(),
                    "Download completed successfully"
                );

                Ok(DownloadResult {
                    data,
                    content_type,
                    content_disposition,
                })
            }
            Err(e) => {
                // Publish download.failed event
                let failed_event = DownloadFailed {
                    job_id,
                    file_id: *file_id,
                    project_id: project_id.to_string(),
                    user_id: user_id.to_string(),
                    error_code: "DOWNLOAD_FAILED".to_string(),
                    error_message: e.to_string(),
                };

                self.event_publisher
                    .publish(Subjects::DOWNLOAD_FAILED, &failed_event)
                    .await?;

                Err(e)
            }
        }
    }
}

/// Extract filename from Content-Disposition header
fn extract_filename(content_disposition: &str) -> Option<String> {
    content_disposition
        .split(';')
        .find_map(|part| {
            let part = part.trim();
            if part.starts_with("filename=") {
                let filename = part.trim_start_matches("filename=");
                let filename = filename.trim_matches('"').trim_matches('\'');
                Some(filename.to_string())
            } else {
                None
            }
        })
}
