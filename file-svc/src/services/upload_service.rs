use std::sync::Arc;

use bytes::Bytes;
use tracing::{info, instrument};
use uuid::Uuid;

use crate::dto::UploadParams;
use crate::error::Result;
use crate::events::{EventPublisher, Subjects, UploadCompleted, UploadFailed, UploadRequested};
use crate::models::FileInfo;
use crate::repositories::traits::FileRepositoryTrait;

/// Service for file uploads
pub struct UploadService<F>
where
    F: FileRepositoryTrait,
{
    file_repo: Arc<F>,
    event_publisher: EventPublisher,
}

impl<F> UploadService<F>
where
    F: FileRepositoryTrait,
{
    pub fn new(file_repo: Arc<F>, event_publisher: EventPublisher) -> Self {
        Self {
            file_repo,
            event_publisher,
        }
    }

    /// Upload a file
    #[instrument(skip(self, data), fields(file_name = %file_name, size = data.len()))]
    pub async fn upload(
        &self,
        params: &UploadParams,
        file_name: &str,
        content_type: &str,
        data: Bytes,
    ) -> Result<FileInfo> {
        let job_id = Uuid::new_v4();
        let file_size = data.len() as u64;

        // Publish upload.requested event
        let requested_event = UploadRequested {
            job_id,
            project_id: params.project_id.clone(),
            user_id: params.user_id.clone(),
            file_name: file_name.to_string(),
            file_size,
            mime_type: content_type.to_string(),
            is_public: params.is_public,
        };

        self.event_publisher
            .publish(Subjects::UPLOAD_REQUESTED, &requested_event)
            .await?;

        // Perform upload
        match self.file_repo.upload(params, file_name, content_type, data).await {
            Ok(file_info) => {
                let download_url = self.file_repo.get_download_url(&file_info.id);

                // Publish upload.completed event
                let completed_event = UploadCompleted {
                    job_id,
                    file_id: file_info.id,
                    project_id: params.project_id.clone(),
                    user_id: params.user_id.clone(),
                    file_name: file_info.original_name.clone(),
                    file_size: file_info.size,
                    mime_type: file_info.mime_type.clone(),
                    is_public: file_info.is_public,
                    download_url,
                };

                self.event_publisher
                    .publish(Subjects::UPLOAD_COMPLETED, &completed_event)
                    .await?;

                info!(
                    file_id = %file_info.id,
                    job_id = %job_id,
                    "Upload completed successfully"
                );

                Ok(file_info)
            }
            Err(e) => {
                // Publish upload.failed event
                let failed_event = UploadFailed {
                    job_id,
                    project_id: params.project_id.clone(),
                    user_id: params.user_id.clone(),
                    file_name: file_name.to_string(),
                    error_code: "UPLOAD_FAILED".to_string(),
                    error_message: e.to_string(),
                };

                self.event_publisher
                    .publish(Subjects::UPLOAD_FAILED, &failed_event)
                    .await?;

                Err(e)
            }
        }
    }
}
