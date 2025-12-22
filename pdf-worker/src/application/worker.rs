use std::collections::HashMap;
use std::time::{Duration, Instant};

use tracing::{info, instrument, warn};
use uuid::Uuid;

use crate::domain::job::PdfJob;
use crate::infrastructure::db::documents_repo::DocumentsRepository;
use crate::infrastructure::pdf_service::client::{
    GenerateDocItem, JobStatusResponse, PdfField, PdfServiceClient, QrPart, QrPdfPart,
};
use crate::infrastructure::redis::queue::RedisQueue;

pub struct Worker {
    queue: RedisQueue,
    docs_repo: DocumentsRepository,
    pdf_client: PdfServiceClient,
    poll_interval_ms: u64,
    max_poll_seconds: u64,
}

impl Worker {
    pub fn new(
        queue: RedisQueue,
        docs_repo: DocumentsRepository,
        pdf_client: PdfServiceClient,
        poll_interval_ms: u64,
        max_poll_seconds: u64,
    ) -> Self {
        Self {
            queue,
            docs_repo,
            pdf_client,
            poll_interval_ms,
            max_poll_seconds,
        }
    }

    pub async fn run(&self) -> anyhow::Result<()> {
        loop {
            let job = self.queue.pop().await?;
            if let Err(err) = self.process_job(job).await {
                // Importante: no caerse el worker por un job malo
                warn!(error = %err, "Job failed");
            }
        }
    }

    #[instrument(
        name = "worker.process_job",
        skip(self, job),
        fields(
            job_id = %job.job_id,
            job_type = %job.job_type,
            event_id = %job.event_id,
            items = job.items.len()
        )
    )]
    async fn process_job(&self, job: PdfJob) -> anyhow::Result<()> {
        info!("Job received");

        // 1) Mapa user_id -> document_id (client_ref)
        let mut user_to_doc: HashMap<Uuid, Uuid> = HashMap::new();
        for it in &job.items {
            if user_to_doc.insert(it.user_id, it.client_ref).is_some() {
                return Err(anyhow::anyhow!(
                    "job invalid: duplicated user_id {} in same job",
                    it.user_id
                ));
            }
        }

        // 2) Construir payload para pdf-service (según el formato actual de tu FastAPI)
        let payload: Vec<GenerateDocItem> = job
            .items
            .iter()
            .map(|it| GenerateDocItem {
                template: it.template.to_string(),
                user_id: it.user_id.to_string(),
                is_public: it.is_public,
                qr: vec![
                    QrPart {
                        base_url: Some(it.qr.base_url.clone()),
                        verify_code: None,
                    },
                    QrPart {
                        base_url: None,
                        verify_code: Some(it.qr.verify_code.clone()),
                    },
                ],
                qr_pdf: vec![
                    QrPdfPart {
                        qr_size_cm: Some(it.qr_pdf.qr_size_cm.clone()),
                        qr_margin_y_cm: None,
                        qr_margin_x_cm: None,
                        qr_page: None,
                        qr_rect: None,
                    },
                    QrPdfPart {
                        qr_size_cm: None,
                        qr_margin_y_cm: Some(it.qr_pdf.qr_margin_y_cm.clone()),
                        qr_margin_x_cm: None,
                        qr_page: None,
                        qr_rect: None,
                    },
                    QrPdfPart {
                        qr_size_cm: None,
                        qr_margin_y_cm: None,
                        qr_margin_x_cm: Some(it.qr_pdf.qr_margin_x_cm.clone()),
                        qr_page: None,
                        qr_rect: None,
                    },
                    QrPdfPart {
                        qr_size_cm: None,
                        qr_margin_y_cm: None,
                        qr_margin_x_cm: None,
                        qr_page: Some(it.qr_pdf.qr_page.clone()),
                        qr_rect: None,
                    },
                    QrPdfPart {
                        qr_size_cm: None,
                        qr_margin_y_cm: None,
                        qr_margin_x_cm: None,
                        qr_page: None,
                        qr_rect: Some(it.qr_pdf.qr_rect.clone()),
                    },
                ],
                pdf: it
                    .pdf
                    .iter()
                    .map(|f| PdfField {
                        key: f.key.clone(),
                        value: f.value.clone(),
                    })
                    .collect(),
            })
            .collect();

        // 3) Enviar a pdf-service
        let created = self.pdf_client.generate_doc(&payload).await?;
        let external_job_id = created.job_id;

        // 4) Poll hasta DONE/FAILED (y si timeout => marcar failed)
        let deadline = Instant::now() + Duration::from_secs(self.max_poll_seconds);

        let js: JobStatusResponse = loop {
            if Instant::now() >= deadline {
                // marcar failed para todo el job
                for it in &job.items {
                    let _ = self.docs_repo.mark_failed(it.client_ref).await;
                }
                return Err(anyhow::anyhow!(
                    "timeout waiting pdf-service job {}",
                    external_job_id
                ));
            }

            let js = self.pdf_client.get_job(&external_job_id).await?;
            let status = js.meta.status.as_str();

            if status == "DONE" || status == "FAILED" {
                break js;
            }

            tokio::time::sleep(Duration::from_millis(self.poll_interval_ms)).await;
        };

        info!(
            status = %js.meta.status,
            total = %js.meta.total,
            processed = %js.meta.processed,
            failed = %js.meta.failed,
            "pdf-service job meta"
        );

        if js.meta.status == "FAILED" {
            // marcar failed para todo el job
            for it in &job.items {
                let _ = self.docs_repo.mark_failed(it.client_ref).await;
            }
            return Err(anyhow::anyhow!("pdf-service job failed: {}", js.job_id));
        }

        let results = js.results.unwrap_or_default();
        info!(count = results.len(), "pdf-service results received");

        // 5) Persistir file_id en Postgres
        for r in results {
            let user_id = Uuid::parse_str(&r.user_id)?;
            let file_id = Uuid::parse_str(&r.file_id)?;

            let document_id = match user_to_doc.get(&user_id) {
                Some(v) => *v,
                None => {
                    warn!(user_id = %user_id, "pdf-service returned user_id not in job");
                    continue;
                }
            };

            let rows = self.docs_repo.set_file_id(document_id, file_id).await?;
            if rows == 0 {
                warn!(document_id = %document_id, "No rows updated (document not found?)");
            }
        }

        info!("Job processed successfully");
        Ok(())
    }
}
