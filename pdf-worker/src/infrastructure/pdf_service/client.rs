use serde::{Deserialize, Serialize};
use tracing::{info, instrument};

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
        let res = self.http.post(url).json(payload).send().await?;
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

        Ok(res.json().await?)
    }
}

/* -------------------- DTOs (request/response) -------------------- */

#[derive(Debug, Serialize)]
pub struct GenerateDocItem {
    pub template: String,
    pub user_id: String,
    pub is_public: bool,

    // tu pdf-service actual usa arrays de objetos
    pub qr: Vec<QrPart>,
    pub qr_pdf: Vec<QrPdfPart>,

    pub pdf: Vec<PdfField>,
}

#[derive(Debug, Serialize)]
pub struct QrPart {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub verify_code: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct QrPdfPart {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub qr_size_cm: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub qr_margin_y_cm: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub qr_margin_x_cm: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub qr_page: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub qr_rect: Option<String>,
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
    pub results: Option<Vec<JobResultItem>>,
}

#[derive(Debug, Deserialize)]
pub struct JobMeta {
    pub status: String, // "QUEUED" | "RUNNING" | "DONE" | "FAILED"
    pub total: String,
    pub processed: String,
    pub failed: String,
}

#[derive(Debug, Deserialize)]
pub struct JobResultItem {
    pub user_id: String,
    pub file_id: String,
}
