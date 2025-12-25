use crate::application::dtos::{UploadFileCommand, UploadedFileData};
use async_trait::async_trait;
use futures_util::StreamExt;
use std::collections::HashMap;
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
    api_base: String,    // FILE_API_URL
}

impl HttpFileRepository {
    pub fn new(http: reqwest::Client, public_base: String, api_base: String) -> Self {
        Self {
            http,
            public_base,
            api_base,
        }
    }
}

fn map_headers(h: HashMap<String, String>) -> reqwest::header::HeaderMap {
    let mut hm = reqwest::header::HeaderMap::new();
    for (k, v) in h {
        if let (Ok(name), Ok(val)) = (
            reqwest::header::HeaderName::from_bytes(k.as_bytes()),
            reqwest::header::HeaderValue::from_str(&v),
        ) {
            hm.insert(name, val);
        }
    }
    hm
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

    async fn upload_file(
        &self,
        headers: HashMap<String, String>,
        project_id: String,
        cmd: UploadFileCommand,
    ) -> Result<UploadedFileData, DomainError> {
        let url = format!("{}/files", self.api_base.trim_end_matches('/'));

        let form = reqwest::multipart::Form::new()
            .text("project_id", project_id)
            .text("user_id", cmd.user_id)
            .text("is_public", if cmd.is_public { "true" } else { "false" })
            .part(
                "file",
                reqwest::multipart::Part::bytes(cmd.content)
                    .file_name(cmd.filename)
                    .mime_str(&cmd.content_type)
                    .map_err(|e| DomainError::BadRequest(format!("invalid mime: {e}")))?,
            );

        let resp = self
            .http
            .post(url)
            .headers(map_headers(headers))
            .multipart(form)
            .send()
            .await
            .map_err(|e| DomainError::Upstream(format!("request failed: {e}")))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(DomainError::Upstream(format!(
                "upstream status {status}: {body}"
            )));
        }

        let json: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| DomainError::Upstream(format!("invalid json: {e}")))?;

        // esperamos { data: { ... }, status: "success", message: ... }
        let data = json
            .get("data")
            .ok_or_else(|| DomainError::Upstream("missing data".into()))?;

        let out = UploadedFileData {
            id: data
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            original_name: data
                .get("original_name")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
            size: data.get("size").and_then(|v| v.as_u64()).unwrap_or(0),
            mime_type: data
                .get("mime_type")
                .and_then(|v| v.as_str())
                .unwrap_or("application/octet-stream")
                .to_string(),
            is_public: data
                .get("is_public")
                .and_then(|v| v.as_bool())
                .unwrap_or(true),
            created_at: data
                .get("created_at")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string(),
        };

        Ok(out)
    }
}
