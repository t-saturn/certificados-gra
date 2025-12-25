use std::{collections::HashMap, sync::Arc};
use tracing::instrument;
use uuid::Uuid;

use crate::application::dtos::{FileDownload, UploadFileCommand, UploadedFileData};
use crate::application::ports::FileRepository;
use crate::domain::errors::DomainError;

use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

#[derive(Clone)]
pub struct FileService {
    repo: Arc<dyn FileRepository>,
    access_key: String,
    secret_key: String,
    project_id: String,
}

impl FileService {
    pub fn new(
        repo: Arc<dyn FileRepository>,
        access_key: String,
        secret_key: String,
        project_id: String,
    ) -> Self {
        Self {
            repo,
            access_key,
            secret_key,
            project_id,
        }
    }

    #[instrument(skip(self))]
    pub async fn download_public(&self, file_id: Uuid) -> Result<FileDownload, DomainError> {
        self.repo.download_public(file_id).await
    }

    #[instrument(skip(self, cmd))]
    pub async fn upload_file(
        &self,
        cmd: UploadFileCommand,
    ) -> Result<UploadedFileData, DomainError> {
        if cmd.user_id.trim().is_empty() {
            return Err(DomainError::BadRequest("user_id is required".into()));
        }
        if cmd.filename.trim().is_empty() {
            return Err(DomainError::BadRequest("filename is required".into()));
        }
        if cmd.content.is_empty() {
            return Err(DomainError::BadRequest("file content is empty".into()));
        }

        let path = "/api/v1/files";
        let timestamp = format!("{}", chrono::Utc::now().timestamp()); // epoch seconds

        let signature = sign_hmac(&self.secret_key, "POST", path, &timestamp);

        let mut headers = HashMap::new();
        headers.insert("X-Access-Key".into(), self.access_key.clone());
        headers.insert("X-Signature".into(), signature);
        headers.insert("X-Timestamp".into(), timestamp);

        self.repo
            .upload_file(headers, self.project_id.clone(), cmd)
            .await
    }
}

fn sign_hmac(secret: &str, method: &str, path: &str, timestamp: &str) -> String {
    let string_to_sign = format!("{}\n{}\n{}", method.to_uppercase(), path, timestamp);
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC can take key of any size");
    mac.update(string_to_sign.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}
