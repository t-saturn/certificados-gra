use async_trait::async_trait;
use futures_util::StreamExt;
use tracing::{instrument, warn};
use uuid::Uuid;

use crate::{
    application::dtos::{ByteStream, FileDownload},
    application::ports::FileRepository,
    domain::errors::DomainError,
};

#[derive(Clone)]
pub struct HttpFileRepository {
    http: reqwest::Client,
    public_base: String, // FILE_PUBLIC_URL
}

impl HttpFileRepository {
    pub fn new(http: reqwest::Client, public_base: String) -> Self {
        Self { http, public_base }
    }
}

#[async_trait]
impl FileRepository for HttpFileRepository {
    #[instrument(skip(self))]
    async fn download_public(&self, file_id: Uuid) -> Result<FileDownload, DomainError> {
        let url = format!(
            "{}/files/{}",
            self.public_base.trim_end_matches('/'),
            file_id
        );

        let resp = self
            .http
            .get(url)
            .send()
            .await
            .map_err(|e| DomainError::Upstream(format!("request failed: {e}")))?;

        if resp.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(DomainError::NotFound);
        }
        if !resp.status().is_success() {
            let status = resp.status();
            warn!(%status, "upstream non-success");
            return Err(DomainError::Upstream(format!("upstream status: {status}")));
        }

        let content_type = resp
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("application/octet-stream")
            .to_string();

        let content_length = resp
            .headers()
            .get(reqwest::header::CONTENT_LENGTH)
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok());

        // reqwest stream -> axum stream: mapear reqwest::Error -> std::io::Error
        // Importante: tipamos explícitamente el closure para evitar E0282
        let s = resp
            .bytes_stream()
            .map(|chunk_res: Result<bytes::Bytes, reqwest::Error>| {
                chunk_res.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
            });

        let stream: ByteStream = Box::pin(s);

        Ok(FileDownload {
            content_type,
            content_length,
            stream,
        })
    }
}
