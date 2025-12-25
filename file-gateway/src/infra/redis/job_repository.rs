use async_trait::async_trait;
use redis::AsyncCommands;

use crate::application::ports::JobRepository;
use crate::domain::job_status::JobStatus;
use crate::infra::redis::RedisClient;

#[derive(Clone)]
pub struct RedisJobRepository {
    redis: RedisClient,
    key_prefix: String,
}

impl RedisJobRepository {
    pub fn new(redis: RedisClient, key_prefix: String) -> Self {
        Self { redis, key_prefix }
    }

    fn key(&self, job_id: &str) -> String {
        format!("{}:jobs:{}", self.key_prefix, job_id)
    }
}

#[async_trait]
impl JobRepository for RedisJobRepository {
    async fn create_pending_if_absent(
        &self,
        job_id: &str,
        ttl_seconds: u64,
    ) -> Result<bool, String> {
        let key = self.key(job_id);
        let mut conn = self.redis.pool().get().await.map_err(|e| e.to_string())?;

        // SET key value NX EX ttl
        // ttl_seconds debe ser u64 (EX espera segundos)
        let created: bool = redis::cmd("SET")
            .arg(&key)
            .arg("PENDING")
            .arg("NX")
            .arg("EX")
            .arg(ttl_seconds) // ✅ u64, no usize
            .query_async(&mut *conn)
            .await
            .map_err(|e| e.to_string())?;

        Ok(created)
    }

    async fn set_success(
        &self,
        job_id: &str,
        file_id: &str,
        ttl_seconds: u64,
    ) -> Result<(), String> {
        let key = self.key(job_id);
        let mut conn = self.redis.pool().get().await.map_err(|e| e.to_string())?;

        let value = serde_json::json!({
            "status": "SUCCESS",
            "result": { "file_id": file_id }
        })
        .to_string();

        let _: () = conn
            .set_ex(key, value, ttl_seconds) // ✅ u64
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn set_failed(
        &self,
        job_id: &str,
        code: &str,
        message: &str,
        ttl_seconds: u64,
    ) -> Result<(), String> {
        let key = self.key(job_id);
        let mut conn = self.redis.pool().get().await.map_err(|e| e.to_string())?;

        let value = serde_json::json!({
            "status": "FAILED",
            "error": { "code": code, "message": message }
        })
        .to_string();

        let _: () = conn
            .set_ex(key, value, ttl_seconds) // ✅ u64
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn get_status(&self, job_id: &str) -> Result<Option<JobStatus>, String> {
        let key = self.key(job_id);
        let mut conn = self.redis.pool().get().await.map_err(|e| e.to_string())?;

        let val: Option<String> = conn.get(key).await.map_err(|e| e.to_string())?;
        let Some(v) = val else {
            return Ok(None);
        };

        // puede ser "PENDING" o JSON
        if v == "PENDING" {
            return Ok(Some(JobStatus::Pending));
        }

        if let Ok(js) = serde_json::from_str::<serde_json::Value>(&v) {
            let st = js.get("status").and_then(|x| x.as_str()).unwrap_or("");
            return Ok(match st {
                "SUCCESS" => Some(JobStatus::Success),
                "FAILED" => Some(JobStatus::Failed),
                _ => None,
            });
        }

        Ok(None)
    }
}
