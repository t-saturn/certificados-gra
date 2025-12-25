use async_trait::async_trait;
use uuid::Uuid;

use crate::application::dtos::FileDownload;
use crate::domain::errors::DomainError;

#[async_trait]
pub trait FileRepository: Send + Sync {
    async fn download_public(&self, file_id: Uuid) -> Result<FileDownload, DomainError>;
}
