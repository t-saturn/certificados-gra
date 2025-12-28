use async_trait::async_trait;
use uuid::Uuid;

use crate::error::Result;
use crate::models::FileJob;

/// Trait for queue operations
#[async_trait]
pub trait QueueRepositoryTrait: Send + Sync {
    /// Push job to queue
    async fn push(&self, job: &FileJob) -> Result<()>;

    /// Pop job from queue (blocking)
    async fn pop(&self, timeout_secs: u64) -> Result<Option<FileJob>>;

    /// Get job by ID
    async fn get(&self, job_id: &Uuid) -> Result<Option<FileJob>>;

    /// Update job
    async fn update(&self, job: &FileJob) -> Result<()>;

    /// Get queue length
    async fn len(&self) -> Result<u64>;
}
