use async_trait::async_trait;
use uuid::Uuid;

use crate::application::dtos::{FileDownload, UploadFileCommand, UploadedFileData};
use crate::domain::errors::DomainError;

#[async_trait]
pub trait FileRepository: Send + Sync {
    async fn download_public(&self, file_id: Uuid) -> Result<FileDownload, DomainError>;

    async fn upload_file(
        &self,
        headers: std::collections::HashMap<String, String>,
        project_id: String,
        cmd: UploadFileCommand,
    ) -> Result<UploadedFileData, DomainError>;
}
