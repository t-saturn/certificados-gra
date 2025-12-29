use async_trait::async_trait;
use bytes::Bytes;
use uuid::Uuid;

use crate::dto::UploadParams;
use crate::error::Result;
use crate::models::{FileInfo, HealthStatus};

/// Trait for file server operations
#[async_trait]
pub trait FileRepositoryTrait: Send + Sync {
    /// Check health of file server
    async fn health(&self, check_db: bool) -> Result<HealthStatus>;

    /// Upload a file to the server
    async fn upload(
        &self,
        params: &UploadParams,
        file_name: &str,
        content_type: &str,
        data: Bytes,
    ) -> Result<FileInfo>;

    /// Get file download URL
    fn get_download_url(&self, file_id: &Uuid) -> String;

    /// Download file bytes (proxy)
    async fn download(&self, file_id: &Uuid) -> Result<(Bytes, String, String)>;
}
