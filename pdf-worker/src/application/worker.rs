use tracing::{info, instrument};

use crate::domain::job::PdfJob;
use crate::infrastructure::db::documents_repo::DocumentsRepository;
use crate::infrastructure::redis::queue::RedisQueue;

pub struct Worker {
    queue: RedisQueue,
    docs_repo: DocumentsRepository,
}

impl Worker {
    pub fn new(queue: RedisQueue, docs_repo: DocumentsRepository) -> Self {
        Self { queue, docs_repo }
    }

    pub async fn run(&self) -> anyhow::Result<()> {
        loop {
            let job = self.queue.pop().await?;
            self.process_job(job).await?;
        }
    }

    #[instrument(
        name = "worker.process_job",
        skip(self, job),
        fields(job_id = %job.job_id, job_type = %job.job_type, event_id = %job.event_id, items = job.items.len())
    )]
    async fn process_job(&self, job: PdfJob) -> anyhow::Result<()> {
        info!("Job received");

        // TODO: aquí luego llamaremos pdf-service y obtendremos results
        // Por ahora, ejemplo: (no hace nada)
        // self.docs_repo.set_file_id(document_id, file_id).await?;

        Ok(())
    }
}
