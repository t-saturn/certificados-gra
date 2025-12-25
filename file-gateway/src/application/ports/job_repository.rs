use async_trait::async_trait;
use crate::domain::job_status::JobStatus;

#[derive(Debug, Clone)]
pub struct JobRecord {
    pub job_id: String,
    pub status: JobStatus,
    pub created_at_epoch: i64,
    pub updated_at_epoch: i64,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
    pub result_file_id: Option<String>,
}

#[async_trait]
pub trait JobRepository: Send + Sync {
    /// Crea job en PENDING si no existe. Devuelve true si se creó, false si ya existía.
    async fn create_pending_if_absent(&self, job_id: &str, ttl_seconds: u64) -> Result<bool, String>;

    async fn set_success(&self, job_id: &str, file_id: &str, ttl_seconds: u64) -> Result<(), String>;
    async fn set_failed(&self, job_id: &str, code: &str, message: &str, ttl_seconds: u64) -> Result<(), String>;

    async fn get_status(&self, job_id: &str) -> Result<Option<JobStatus>, String>;
}
