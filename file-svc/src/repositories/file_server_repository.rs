use async_trait::async_trait;
use bytes::Bytes;
use reqwest::{multipart, Client};
use tracing::{info, instrument};
use uuid::Uuid;

use crate::config::FileServerConfig;
use crate::dto::{FileServerResponse, UploadParams};
use crate::error::{AppError, Result};
use crate::models::{DatabaseHealth, FileInfo, FileServerHealth, HealthStatus};
use crate::services::SignatureService;

use super::traits::FileRepositoryTrait;

/// Repository for external file server operations
pub struct FileServerRepository {
    client: Client,
    config: FileServerConfig,
    signature_service: SignatureService,
}

impl FileServerRepository {
    pub fn new(config: FileServerConfig) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .expect("Failed to create HTTP client");

        let signature_service = SignatureService::new(
            config.access_key.clone(),
            config.secret_key.clone(),
        );

        Self {
            client,
            config,
            signature_service,
        }
    }
}

#[async_trait]
impl FileRepositoryTrait for FileServerRepository {
    #[instrument(skip(self))]
    async fn health(&self, check_db: bool) -> Result<HealthStatus> {
        let url = if check_db {
            self.config.health_db_url()
        } else {
            self.config.health_url()
        };

        let start = std::time::Instant::now();
        let response = self.client.get(&url).send().await?;
        let elapsed = start.elapsed().as_millis() as u64;

        if !response.status().is_success() {
            return Err(AppError::ExternalService(format!(
                "File server returned status: {}",
                response.status()
            )));
        }

        let server_health: serde_json::Value = response.json().await?;

        let mut health = HealthStatus::ok().with_file_server(FileServerHealth {
            status: "up".to_string(),
            url: self.config.base_url.clone(),
            response_time_ms: elapsed,
        });

        // Extract database health if present
        if let Some(data) = server_health.get("data") {
            if let Some(db) = data.get("database") {
                health = health.with_database(DatabaseHealth {
                    status: db.get("status").and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
                    engine: db.get("engine").and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
                    response_time_ms: db.get("response_time_ms").and_then(|v| v.as_u64()).unwrap_or(0),
                    open_connections: db.get("open_connections").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                    in_use: db.get("in_use").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                    idle: db.get("idle").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                });
            }
        }

        Ok(health)
    }

    #[instrument(skip(self, data), fields(file_name = %file_name, size = data.len()))]
    async fn upload(
        &self,
        params: &UploadParams,
        file_name: &str,
        content_type: &str,
        data: Bytes,
    ) -> Result<FileInfo> {
        let endpoint = self.config.files_endpoint();
        let (timestamp, signature) = self.signature_service.generate("POST", "/api/v1/files");

        // Build multipart form
        let file_part = multipart::Part::bytes(data.to_vec())
            .file_name(file_name.to_string())
            .mime_str(content_type)
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let form = multipart::Form::new()
            .text("project_id", params.project_id.clone())
            .text("user_id", params.user_id.clone())
            .text("is_public", params.is_public.to_string())
            .part("file", file_part);

        info!(
            endpoint = %endpoint,
            project_id = %params.project_id,
            user_id = %params.user_id,
            "Uploading file to file server"
        );

        let response = self
            .client
            .post(&endpoint)
            .header("X-Access-Key", &self.config.access_key)
            .header("X-Signature", &signature)
            .header("X-Timestamp", &timestamp)
            .multipart(form)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::ExternalService(format!(
                "Upload failed: {}",
                error_text
            )));
        }

        let result: FileServerResponse<FileInfo> = response.json().await?;
        info!(file_id = %result.data.id, "File uploaded successfully");

        Ok(result.data)
    }

    fn get_download_url(&self, file_id: &Uuid) -> String {
        self.config.public_file_url(&file_id.to_string())
    }

    #[instrument(skip(self))]
    async fn download(&self, file_id: &Uuid) -> Result<(Bytes, String, String)> {
        let url = self.get_download_url(file_id);

        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            if response.status() == reqwest::StatusCode::NOT_FOUND {
                return Err(AppError::NotFound(format!("File {} not found", file_id)));
            }
            return Err(AppError::ExternalService(format!(
                "Download failed with status: {}",
                response.status()
            )));
        }

        let content_type = response
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("application/octet-stream")
            .to_string();

        let content_disposition = response
            .headers()
            .get("content-disposition")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();

        let bytes = response.bytes().await?;

        Ok((bytes, content_type, content_disposition))
    }
}
