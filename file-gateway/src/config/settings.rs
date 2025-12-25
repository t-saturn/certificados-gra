use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Settings {
    // file server
    pub file_base_url: String,
    pub file_public_url: String,
    pub file_api_url: String,
    pub file_access_key: String,
    pub file_secret_key: String,
    pub file_project_id: String,

    // redis
    pub redis_host: String,
    pub redis_port: u16,
    pub redis_db: i64,
    pub redis_password: Option<String>,
    pub redis_queue_file_jobs: String,
    pub redis_job_ttl_seconds: u64,
    pub redis_key_prefix: String,

    // nats
    pub nats_url: String,

    // http
    pub http_host: String,
    pub http_port: u16,

    // logs
    pub log_dir: String,
    pub log_file: String,
}

impl Settings {
    pub fn from_env() -> Result<Self, config::ConfigError> {
        dotenvy::dotenv().ok();

        config::Config::builder()
            .add_source(config::Environment::default())
            .build()?
            .try_deserialize()
    }

    pub fn http_addr(&self) -> String {
        format!("{}:{}", self.http_host, self.http_port)
    }

    pub fn redis_url(&self) -> String {
        // redis://:password@host:port/db
        // o redis://host:port/db
        match &self.redis_password {
            Some(pw) if !pw.is_empty() => format!(
                "redis://:{}@{}:{}/{}",
                pw, self.redis_host, self.redis_port, self.redis_db
            ),
            _ => format!(
                "redis://{}:{}/{}",
                self.redis_host, self.redis_port, self.redis_db
            ),
        }
    }

    pub fn key(&self, suffix: &str) -> String {
        // namespacing general: filegw:<suffix>
        format!("{}:{}", self.redis_key_prefix, suffix)
    }
}
