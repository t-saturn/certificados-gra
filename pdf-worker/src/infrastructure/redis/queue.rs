use redis::{AsyncCommands, Client};
use tracing::{info, instrument};

use crate::domain::job::PdfJob;

pub struct RedisQueue {
    client: Client,
    queue: String,
}

impl RedisQueue {
    #[instrument(name = "redis.connect", skip(redis_url, queue), fields(queue = %queue))]
    pub async fn connect(redis_url: &str, queue: &str) -> anyhow::Result<Self> {
        let client = Client::open(redis_url)?;

        // Conexión multiplexed (no deprecated)
        let mut conn = client.get_multiplexed_async_connection().await?;

        // Ping para validar conectividad real
        let pong: String = redis::cmd("PING").query_async(&mut conn).await?;
        info!(pong = %pong, "Redis connected successfully");

        Ok(Self {
            client,
            queue: queue.to_string(),
        })
    }

    #[instrument(name = "redis.queue.pop", skip(self), fields(queue = %self.queue))]
    pub async fn pop(&self) -> anyhow::Result<PdfJob> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;

        // timeout f64
        let (_q, payload): (String, String) = conn.blpop(&self.queue, 0.0).await?;

        let job: PdfJob = serde_json::from_str(&payload).map_err(|e| {
            anyhow::anyhow!("invalid job payload: {}", e)
        })?;

        Ok(job)
    }
}
