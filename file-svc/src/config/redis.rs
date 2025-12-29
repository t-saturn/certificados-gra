use std::env;

/// Redis configuration
#[derive(Debug, Clone)]
pub struct RedisConfig {
    pub host: String,
    pub port: u16,
    pub db: u8,
    pub password: Option<String>,
    pub queue_file_jobs: String,
    pub job_ttl_seconds: u64,
    pub key_prefix: String,
}

impl RedisConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            host: env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            port: env::var("REDIS_PORT")
                .unwrap_or_else(|_| "6379".to_string())
                .parse()?,
            db: env::var("REDIS_DB")
                .unwrap_or_else(|_| "0".to_string())
                .parse()?,
            password: env::var("REDIS_PASSWORD").ok(),
            queue_file_jobs: env::var("REDIS_QUEUE_FILE_JOBS")
                .unwrap_or_else(|_| "queue:file:jobs".to_string()),
            job_ttl_seconds: env::var("REDIS_JOB_TTL_SECONDS")
                .unwrap_or_else(|_| "3600".to_string())
                .parse()?,
            key_prefix: env::var("REDIS_KEY_PREFIX").unwrap_or_else(|_| "filesvc".to_string()),
        })
    }

    /// Build Redis connection URL
    pub fn connection_url(&self) -> String {
        match &self.password {
            Some(pwd) => format!(
                "redis://:{}@{}:{}/{}",
                pwd, self.host, self.port, self.db
            ),
            None => format!("redis://{}:{}/{}", self.host, self.port, self.db),
        }
    }

    /// Build prefixed key
    pub fn key(&self, suffix: &str) -> String {
        format!("{}:{}", self.key_prefix, suffix)
    }
}
