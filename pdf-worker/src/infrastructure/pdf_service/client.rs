use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{info, instrument};

fn truncate(s: &str, max: usize) -> &str {
    if s.len() <= max { s } else { &s[..max] }
}

#[derive(Clone)]
pub struct PdfServiceClient {
    base_url: String,
    http: reqwest::Client,
}

impl PdfServiceClient {
    pub fn new(base_url: String) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            http: reqwest::Client::new(),
        }
    }

    #[instrument(name = "pdf_service.generate_doc", skip(self, payload), fields(total = payload.len()))]
    pub async fn generate_doc(
        &self,
        payload: &[GenerateDocItem],
    ) -> anyhow::Result<GenerateDocResponse> {
        let url = format!("{}/generate-doc", self.base_url);

        // preview JSON (útil para ver si qr_pdf sale vacío)
        let preview = serde_json::to_string(payload)
            .map(|s| truncate(&s, 2000).to_string())
            .unwrap_or_else(|e| format!("<failed to serialize payload preview: {}>", e));

        info!(
            endpoint = %url,
            payload_preview = %preview,
            "pdf_service_request_preview"
        );

        let res = self.http.post(&url).json(payload).send().await?;
        let status = res.status();

        if !status.is_success() {
            let body = res.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!(
                "pdf-service generate-doc failed: status={} body={}",
                status,
                body
            ));
        }

        let out: GenerateDocResponse = res.json().await?;
        info!(job_id = %out.job_id, status = %out.status, total = out.total, "pdf-service job queued");
        Ok(out)
    }

    #[instrument(name = "pdf_service.get_job", skip(self), fields(job_id = %job_id))]
    pub async fn get_job(&self, job_id: &str) -> anyhow::Result<JobStatusResponse> {
        let url = format!("{}/jobs/{}", self.base_url, job_id);

        let res = self.http.get(url).send().await?;
        let status = res.status();

        if !status.is_success() {
            let body = res.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!(
                "pdf-service get-job failed: status={} body={}",
                status,
                body
            ));
        }

        let out: JobStatusResponse = res.json().await?;
        info!(requested_job_id = %job_id, response_job_id = %out.job_id, status = %out.meta.status, "pdf-service job fetched");
        Ok(out)
    }
}

/* -------------------- DTOs -------------------- */

#[derive(Debug, Serialize)]
pub struct GenerateDocItem {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_ref: Option<String>,

    pub template: String,
    pub user_id: String,
    pub is_public: bool,

    // coincide con tu dominio actual:
    pub qr: Vec<HashMap<String, serde_json::Value>>,
    pub qr_pdf: Vec<HashMap<String, serde_json::Value>>,

    pub pdf: Vec<PdfField>,
}

#[derive(Debug, Serialize)]
pub struct PdfField {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Deserialize)]
pub struct GenerateDocResponse {
    pub job_id: String,
    pub status: String,
    pub total: i64,
}

#[derive(Debug, Deserialize)]
pub struct JobStatusResponse {
    pub job_id: String,
    pub meta: JobMeta,
    pub results: Vec<JobResultItem>,
}

#[derive(Debug, Deserialize)]
pub struct JobMeta {
    pub status: String,
    pub total: String,
    pub processed: String,
    pub failed: String,
}

#[derive(Debug, Deserialize)]
pub struct JobResultItem {
    pub client_ref: Option<String>,
    pub user_id: String,
    pub file_id: String,
    pub verify_code: Option<String>,

    pub file_name: Option<String>,
    pub file_hash: Option<String>,
    pub file_size_bytes: Option<i64>,
    pub storage_provider: Option<String>,
}
