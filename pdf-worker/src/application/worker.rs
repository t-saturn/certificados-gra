use tracing::{info, instrument};

use crate::infrastructure::redis::queue::RedisQueue;

pub struct Worker {
    queue: RedisQueue,
}

impl Worker {
    pub fn new(queue: RedisQueue) -> Self {
        Self { queue }
    }

    pub async fn run(&self) -> anyhow::Result<()> {
        loop {
            let job = self.queue.pop().await?;

            // Span por job (útil para correlación)
            self.process_job(job).await?;
        }
    }

    #[instrument(
        name = "worker.process_job",
        skip(self, job),
        fields(job_id = %job.job_id, event_id = %job.event_id, docs = job.documents.len())
    )]
    async fn process_job(&self, job: crate::domain::job::PdfJob) -> anyhow::Result<()> {
        info!("Job received");
        // aquí luego:
        // - llamar pdf-service
        // - polling results
        // - update DB
        Ok(())
    }
}
