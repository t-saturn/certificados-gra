use async_trait::async_trait;

use crate::domain::job_status::JobStatus;

#[derive(Debug, Clone)]
pub struct JobRecord {
    pub status: JobStatus,
    pub raw_json: Option<String>, // para SUCCESS/FAILED (contiene result/error)
}

#[async_trait]
pub trait JobRepository: Send + Sync {
    async fn create_pending_if_absent(
        &self,
        job_id: &str,
        ttl_seconds: u64,
    ) -> Result<bool, String>;

    async fn set_success(
        &self,
        job_id: &str,
        file_id: &str,
        ttl_seconds: u64,
    ) -> Result<(), String>;
    async fn set_failed(
        &self,
        job_id: &str,
        code: &str,
        message: &str,
        ttl_seconds: u64,
    ) -> Result<(), String>;

    async fn get_status(&self, job_id: &str) -> Result<Option<JobStatus>, String>;

    // nuevo: trae status + raw_json
    async fn get_record(&self, job_id: &str) -> Result<Option<JobRecord>, String>;
}
