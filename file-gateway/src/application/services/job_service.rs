use std::sync::Arc;

use base64::{Engine as _, engine::general_purpose};
use tracing::{info, instrument, warn};

use crate::application::dtos::{
    JobErrorDto, JobResultDto, JobStateDto, JobStatusDto, UploadCompletedEvent, UploadFailedEvent,
    UploadFileCommand, UploadRequestedEvent,
};
use crate::application::ports::job_repository::JobRecord;
use crate::application::ports::{EventBus, JobRepository};
use crate::application::services::file_service::FileService;
use crate::domain::job_status::JobStatus;

#[derive(Clone)]
pub struct JobService {
    pub jobs: Arc<dyn JobRepository>,
    pub bus: Arc<dyn EventBus>,
    pub file_service: FileService,
    pub ttl_seconds: u64,
}

impl JobService {
    pub fn new(
        jobs: Arc<dyn JobRepository>,
        bus: Arc<dyn EventBus>,
        file_service: FileService,
        ttl_seconds: u64,
    ) -> Self {
        Self {
            jobs,
            bus,
            file_service,
            ttl_seconds,
        }
    }

    #[instrument(skip(self, evt))]
    pub async fn handle_upload_requested(&self, evt: UploadRequestedEvent) {
        // 1) idempotencia: si job existe, no reprocesar
        match self
            .jobs
            .create_pending_if_absent(&evt.job_id, self.ttl_seconds)
            .await
        {
            Ok(true) => info!(job_id = %evt.job_id, "job created PENDING"),
            Ok(false) => {
                let st = self.jobs.get_status(&evt.job_id).await.ok().flatten();
                info!(job_id = %evt.job_id, status = ?st, "job already exists; skipping");
                return;
            }
            Err(e) => {
                warn!(job_id = %evt.job_id, error = %e, "failed to create job record");
                return;
            }
        }

        // 2) decode base64 -> bytes
        let content = match general_purpose::STANDARD.decode(evt.content_base64.as_bytes()) {
            Ok(b) => b,
            Err(e) => {
                self.fail_and_publish(&evt.job_id, "INVALID_BASE64", &e.to_string())
                    .await;
                return;
            }
        };

        // 3) ejecutar caso de uso (upload a file-server)
        let cmd = UploadFileCommand {
            user_id: evt.user_id,
            is_public: evt.is_public,
            filename: evt.filename,
            content_type: evt.content_type,
            content,
        };

        match self.file_service.upload_file(cmd).await {
            Ok(out) => {
                // Redis SUCCESS
                if let Err(e) = self
                    .jobs
                    .set_success(&evt.job_id, &out.id, self.ttl_seconds)
                    .await
                {
                    warn!(job_id=%evt.job_id, error=%e, "failed set_success in redis");
                }

                // Publish completed
                let completed = UploadCompletedEvent {
                    job_id: evt.job_id,
                    file_id: out.id,
                    original_name: out.original_name,
                    size: out.size,
                    mime_type: out.mime_type,
                    is_public: out.is_public,
                    created_at: out.created_at,
                };

                let payload = serde_json::to_vec(&completed).unwrap_or_default();
                if let Err(e) = self.bus.publish("files.upload.completed", payload).await {
                    warn!(error=%e, "failed publish completed");
                }
            }
            Err(e) => {
                self.fail_and_publish(&evt.job_id, "UPLOAD_FAILED", &e.to_string())
                    .await;
            }
        }
    }

    async fn fail_and_publish(&self, job_id: &str, code: &str, message: &str) {
        if let Err(e) = self
            .jobs
            .set_failed(job_id, code, message, self.ttl_seconds)
            .await
        {
            warn!(job_id=%job_id, error=%e, "failed set_failed in redis");
        }

        let failed = UploadFailedEvent {
            job_id: job_id.to_string(),
            code: code.to_string(),
            message: message.to_string(),
        };

        let payload = serde_json::to_vec(&failed).unwrap_or_default();
        if let Err(e) = self.bus.publish("files.upload.failed", payload).await {
            warn!(error=%e, "failed publish failed");
        }
    }

    pub async fn get_job_status(&self, job_id: &str) -> Result<Option<JobStatusDto>, String> {
        let rec: Option<JobRecord> = self.jobs.get_record(job_id).await?;
        let Some(rec) = rec else {
            return Ok(None);
        };

        match rec.status {
            JobStatus::Pending => Ok(Some(JobStatusDto {
                job_id: job_id.to_string(),
                state: JobStateDto::Pending,
                result: None,
                error: None,
            })),

            JobStatus::Success => {
                let raw = rec.raw_json.unwrap_or_default();
                let v: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;

                let file_id = v
                    .get("result")
                    .and_then(|r| r.get("file_id"))
                    .and_then(|x| x.as_str())
                    .unwrap_or("")
                    .to_string();

                Ok(Some(JobStatusDto {
                    job_id: job_id.to_string(),
                    state: JobStateDto::Success,
                    result: Some(JobResultDto { file_id }),
                    error: None,
                }))
            }

            JobStatus::Failed => {
                let raw = rec.raw_json.unwrap_or_default();
                let v: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;

                let code = v
                    .get("error")
                    .and_then(|e| e.get("code"))
                    .and_then(|x| x.as_str())
                    .unwrap_or("UNKNOWN")
                    .to_string();

                let message = v
                    .get("error")
                    .and_then(|e| e.get("message"))
                    .and_then(|x| x.as_str())
                    .unwrap_or("Unknown error")
                    .to_string();

                Ok(Some(JobStatusDto {
                    job_id: job_id.to_string(),
                    state: JobStateDto::Failed,
                    result: None,
                    error: Some(JobErrorDto { code, message }),
                }))
            }
        }
    }
}
