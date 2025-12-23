use crate::domain::job::PdfJob;
use crate::infrastructure::pdf_service::client::{
    GenerateDocItem, PdfField as OutPdfField, PdfServiceClient,
};
use crate::infrastructure::redis::queue::RedisQueue;

use anyhow::Context;
use serde_json::json;
use tokio::time::{Duration, Instant, sleep};
use tracing::{error, info, instrument, warn};

pub struct Worker {
    queue: RedisQueue,
    pdf_client: PdfServiceClient,
    poll_interval_ms: u64,
    max_poll_seconds: u64,
}

fn truncate_owned(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}...<truncated {} chars>", &s[..max], s.len() - max)
    }
}

impl Worker {
    pub fn new(
        queue: RedisQueue,
        pdf_client: PdfServiceClient,
        poll_interval_ms: u64,
        max_poll_seconds: u64,
    ) -> Self {
        Self {
            queue,
            pdf_client,
            poll_interval_ms,
            max_poll_seconds,
        }
    }

    pub async fn run(&self) -> anyhow::Result<()> {
        loop {
            let job = self.queue.pop_job().await?;
            if let Err(e) = self.handle_job(job).await {
                error!(error = %e, "job_failed_unhandled");
            }
        }
    }

    #[instrument(
        name = "worker.handle_job",
        skip(self, job),
        fields(job_id = %job.job_id, event_id = %job.event_id, job_type = %job.job_type)
    )]
    async fn handle_job(&self, job: PdfJob) -> anyhow::Result<()> {
        if job.job_type != "GENERATE_DOCS" {
            warn!(job_type = %job.job_type, "job_ignored");
            return Ok(());
        }

        let rust_job_id = job.job_id.to_string();
        let total = job.items.len() as i64;

        self.queue
            .set_meta_running(&rust_job_id, total)
            .await
            .context("set_meta_running")?;

        // items -> payload pdf-service
        let payload: Vec<GenerateDocItem> = job
            .items
            .into_iter()
            .map(|it| GenerateDocItem {
                client_ref: Some(it.client_ref.to_string()),
                template: it.template.to_string(),
                user_id: it.user_id.to_string(),
                is_public: it.is_public,

                // ya coinciden con el DTO (Vec<HashMap<String, Value>>)
                qr: it.qr,
                qr_pdf: it.qr_pdf,

                pdf: it
                    .pdf
                    .into_iter()
                    .map(|f: crate::domain::job::PdfField| OutPdfField {
                        key: f.key,
                        value: f.value,
                    })
                    .collect(),
            })
            .collect();

        info!(
            total = payload.len(),
            "mapped job items -> pdf-service payload"
        );

        for (idx, it) in payload.iter().enumerate() {
            let qr_count = it.qr.len();
            let qr_pdf_count = it.qr_pdf.len();

            // detecta si existe qr_rect dentro de qr_pdf
            let has_qr_rect = it.qr_pdf.iter().any(|m| m.contains_key("qr_rect"));

            info!(
                idx = idx,
                client_ref = ?it.client_ref,
                template = %it.template,
                user_id = %it.user_id,
                is_public = it.is_public,
                qr_count = qr_count,
                qr_pdf_count = qr_pdf_count,
                has_qr_rect = has_qr_rect,
                "payload_item_summary"
            );
        }

        let payload_json = serde_json::to_string_pretty(&payload)
            .unwrap_or_else(|e| format!("<failed to serialize payload: {}>", e));

        info!(
            payload_len = payload_json.len(),
            payload_preview = %truncate_owned(&payload_json, 4000),
            "pdf_service_payload_json_preview"
        );

        info!(total = payload.len(), "calling pdf-service /generate-doc");

        let queued = self
            .pdf_client
            .generate_doc(&payload)
            .await
            .context("pdf_service.generate_doc")?;

        // guardamos id del job en python dentro del meta del job rust
        let _ = self
            .queue
            .set_meta_pdf_job_id(&rust_job_id, &queued.job_id)
            .await;

        // polling
        let deadline = Instant::now() + Duration::from_secs(self.max_poll_seconds);

        loop {
            let st = self
                .pdf_client
                .get_job(&queued.job_id)
                .await
                .context("pdf_service.get_job")?;
            let status = st.meta.status.as_str();

            info!(pdf_job_id = %queued.job_id, status = %status, "pdf-job status");

            match status {
                "DONE" | "DONE_WITH_ERRORS" => {
                    for r in st.results {
                        let entry = json!({
                            "client_ref": r.client_ref,
                            "user_id": r.user_id,
                            "file_id": r.file_id,
                            "verify_code": r.verify_code,
                            "file_name": r.file_name,
                            "file_hash": r.file_hash,
                            "file_size_bytes": r.file_size_bytes,
                            "storage_provider": r.storage_provider,
                        });

                        self.queue
                            .push_result(&rust_job_id, &entry.to_string())
                            .await
                            .context("push_result")?;
                    }

                    let _ = self
                        .queue
                        .set_meta_done_from_pdf_meta(
                            &rust_job_id,
                            &st.meta.status,
                            &st.meta.total,
                            &st.meta.processed,
                            &st.meta.failed,
                        )
                        .await;

                    info!(rust_job_id = %rust_job_id, pdf_job_id = %queued.job_id, "job_finished");
                    return Ok(());
                }

                "FAILED" => {
                    let _ = self.queue.set_meta_failed(&rust_job_id).await;
                    let _ = self
                        .queue
                        .push_error(
                            &rust_job_id,
                            &json!({"error": "pdf-service job FAILED", "pdf_job_id": queued.job_id}).to_string(),
                        )
                        .await;

                    return Err(anyhow::anyhow!("pdf-service job FAILED: {}", queued.job_id));
                }

                _ => {
                    // sigue polling
                }
            }

            if Instant::now() >= deadline {
                let _ = self.queue.set_meta_failed(&rust_job_id).await;
                let _ = self
                    .queue
                    .push_error(
                        &rust_job_id,
                        &json!({"error": "timeout polling pdf-service", "pdf_job_id": queued.job_id}).to_string(),
                    )
                    .await;

                return Err(anyhow::anyhow!(
                    "timeout polling pdf-service job {}",
                    queued.job_id
                ));
            }

            sleep(Duration::from_millis(self.poll_interval_ms)).await;
        }
    }
}
