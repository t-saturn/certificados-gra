use async_trait::async_trait;
use redis::aio::ConnectionManager;
use redis::AsyncCommands;
use tracing::instrument;
use uuid::Uuid;

use crate::config::RedisConfig;
use crate::error::Result;
use crate::models::FileJob;

use super::traits::QueueRepositoryTrait;

/// Redis queue repository implementation
#[derive(Clone)]
pub struct RedisQueueRepository {
    conn: ConnectionManager,
    config: RedisConfig,
}

impl RedisQueueRepository {
    pub async fn new(config: RedisConfig) -> Result<Self> {
        let client = redis::Client::open(config.connection_url())?;
        let conn = ConnectionManager::new(client).await?;

        Ok(Self { conn, config })
    }

    fn queue_key(&self) -> String {
        self.config.key(&self.config.queue_file_jobs)
    }

    fn job_key(&self, job_id: &Uuid) -> String {
        self.config.key(&format!("job:{}", job_id))
    }
}

#[async_trait]
impl QueueRepositoryTrait for RedisQueueRepository {
    #[instrument(skip(self, job), fields(job_id = %job.id))]
    async fn push(&self, job: &FileJob) -> Result<()> {
        let mut conn = self.conn.clone();
        let queue_key = self.queue_key();
        let job_key = self.job_key(&job.id);

        // Store job data
        let serialized = serde_json::to_string(job)?;
        conn.set_ex(&job_key, &serialized, self.config.job_ttl_seconds).await?;

        // Push job ID to queue
        conn.rpush(&queue_key, job.id.to_string()).await?;

        Ok(())
    }

    #[instrument(skip(self))]
    async fn pop(&self, timeout_secs: u64) -> Result<Option<FileJob>> {
        let mut conn = self.conn.clone();
        let queue_key = self.queue_key();

        // Blocking pop from queue
        let result: Option<(String, String)> = conn
            .blpop(&queue_key, timeout_secs as f64)
            .await?;

        match result {
            Some((_, job_id_str)) => {
                let job_id = Uuid::parse_str(&job_id_str)
                    .map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
                self.get(&job_id).await
            }
            None => Ok(None),
        }
    }

    #[instrument(skip(self))]
    async fn get(&self, job_id: &Uuid) -> Result<Option<FileJob>> {
        let mut conn = self.conn.clone();
        let job_key = self.job_key(job_id);

        let value: Option<String> = conn.get(&job_key).await?;

        match value {
            Some(v) => {
                let job: FileJob = serde_json::from_str(&v)?;
                Ok(Some(job))
            }
            None => Ok(None),
        }
    }

    #[instrument(skip(self, job), fields(job_id = %job.id))]
    async fn update(&self, job: &FileJob) -> Result<()> {
        let mut conn = self.conn.clone();
        let job_key = self.job_key(&job.id);

        let serialized = serde_json::to_string(job)?;
        conn.set_ex(&job_key, serialized, self.config.job_ttl_seconds).await?;

        Ok(())
    }

    #[instrument(skip(self))]
    async fn len(&self) -> Result<u64> {
        let mut conn = self.conn.clone();
        let queue_key = self.queue_key();

        let len: u64 = conn.llen(&queue_key).await?;
        Ok(len)
    }
}
