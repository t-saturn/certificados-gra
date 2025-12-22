use anyhow::Context;
use tracing::{info, warn};

use crate::infrastructure::pdf_service::client::PdfServiceClient;
use crate::infrastructure::redis::queue::RedisQueue;

pub struct Worker {
    queue: RedisQueue,
    pdf_client: PdfServiceClient,
    poll_interval_ms: u64,
    max_poll_seconds: u64,
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
            // Por ahora solo escuchamos y logueamos.
            // En el siguiente paso: parse del job + call a pdf-service + guardar results.
            let payload = self.queue.pop().await.context("failed to pop redis job")?;

            warn!(
                job_id = %payload.job_id,
                job_type = %payload.job_type,
                items = payload.items.len(),
                "Job received (handler not implemented yet)"
            );
            // Evitamos warnings por no usar pdf_client en esta fase:
            let _ = (
                &self.pdf_client,
                self.poll_interval_ms,
                self.max_poll_seconds,
            );

            // Aquí luego irá:
            // - deserialize
            // - call pdf_service.generate_docs
            // - poll job status
            // - fetch results
            // - write results/meta for Go
            info!("Worker loop tick done");
        }
    }
}
