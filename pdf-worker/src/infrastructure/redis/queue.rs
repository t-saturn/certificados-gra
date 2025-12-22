use crate::domain::job::PdfJob;

use redis::AsyncCommands;
use tracing::{info, instrument};

pub struct RedisQueue {
    client: redis::Client,
    queue: String,
}

impl RedisQueue {
    pub async fn connect(redis_url: &str, queue: &str) -> anyhow::Result<Self> {
        let client = redis::Client::open(redis_url)?;
        let mut conn = client.get_multiplexed_async_connection().await?;

        let pong: String = redis::cmd("PING").query_async(&mut conn).await?;
        info!(pong = %pong, queue = %queue, "Redis connected successfully");

        Ok(Self {
            client,
            queue: queue.to_string(),
        })
    }

    fn meta_key(job_id: &str) -> String {
        format!("job:{}:meta", job_id)
    }

    fn results_key(job_id: &str) -> String {
        format!("job:{}:results", job_id)
    }

    fn errors_key(job_id: &str) -> String {
        format!("job:{}:errors", job_id)
    }

    /// BLPOP bloqueante del queue del worker (queue:docs:generate)
    #[instrument(name = "redis.pop_job", skip(self))]
    pub async fn pop_job(&self) -> anyhow::Result<PdfJob> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;

        // redis::Commands::blpop(key, timeout_seconds as f64)
        let (_q, payload): (String, String) = conn.blpop(&self.queue, 0.0).await?;
        let job: PdfJob = serde_json::from_str(&payload)?;

        Ok(job)
    }

    pub async fn set_meta_running(&self, job_id: &str, total: i64) -> anyhow::Result<()> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let key = Self::meta_key(job_id);

        let _: () = conn
            .hset_multiple(
                &key,
                &[
                    ("status", "RUNNING"),
                    ("total", &total.to_string()),
                    ("processed", "0"),
                    ("failed", "0"),
                ],
            )
            .await?;

        Ok(())
    }

    pub async fn set_meta_pdf_job_id(&self, job_id: &str, pdf_job_id: &str) -> anyhow::Result<()> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let key = Self::meta_key(job_id);

        let _: () = conn.hset(&key, "pdf_job_id", pdf_job_id).await?;
        Ok(())
    }

    pub async fn push_result(&self, job_id: &str, json_line: &str) -> anyhow::Result<()> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let key = Self::results_key(job_id);

        let _: () = conn.rpush(&key, json_line).await?;
        Ok(())
    }

    pub async fn push_error(&self, job_id: &str, json_line: &str) -> anyhow::Result<()> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let key = Self::errors_key(job_id);

        let _: () = conn.rpush(&key, json_line).await?;
        Ok(())
    }

    pub async fn set_meta_done_from_pdf_meta(
        &self,
        job_id: &str,
        status: &str,
        total: &str,
        processed: &str,
        failed: &str,
    ) -> anyhow::Result<()> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let key = Self::meta_key(job_id);

        let _: () = conn
            .hset_multiple(
                &key,
                &[
                    ("status", status),
                    ("total", total),
                    ("processed", processed),
                    ("failed", failed),
                ],
            )
            .await?;

        Ok(())
    }

    pub async fn set_meta_failed(&self, job_id: &str) -> anyhow::Result<()> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let key = Self::meta_key(job_id);

        let _: () = conn.hset(&key, "status", "FAILED").await?;
        Ok(())
    }
}
