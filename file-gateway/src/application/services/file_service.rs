use std::sync::Arc;
use tracing::instrument;
use uuid::Uuid;

use crate::application::dtos::FileDownload;
use crate::application::ports::FileRepository;
use crate::domain::errors::DomainError;

#[derive(Clone)]
pub struct FileService {
    repo: Arc<dyn FileRepository>,
}

impl FileService {
    pub fn new(repo: Arc<dyn FileRepository>) -> Self {
        Self { repo }
    }

    #[instrument(skip(self))]
    pub async fn download_public(&self, file_id: Uuid) -> Result<FileDownload, DomainError> {
        self.repo.download_public(file_id).await
    }
}
