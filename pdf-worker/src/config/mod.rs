use std::env;

pub struct Config {
    pub redis_url: String,
    pub redis_queue: String,

    pub pdf_service_base_url: String,
    pub pdf_poll_interval_ms: u64,
    pub pdf_max_poll_seconds: u64,
}

impl Config {
    pub fn from_env() -> Self {
        let redis_host = env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let redis_port = env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
        let redis_db = env::var("REDIS_DB").unwrap_or_else(|_| "0".to_string());

        let redis_password = env::var("REDIS_PASSWORD").ok().filter(|s| !s.is_empty());

        let redis_url = match redis_password {
            Some(pw) => format!("redis://:{}@{}:{}/{}", pw, redis_host, redis_port, redis_db),
            None => format!("redis://{}:{}/{}", redis_host, redis_port, redis_db),
        };

        let redis_queue = env::var("REDIS_QUEUE_PDF_JOBS")
            .unwrap_or_else(|_| "queue:cert:generate".to_string());

        let pdf_service_base_url =
            env::var("PDF_SERVICE_BASE_URL").unwrap_or_else(|_| "http://127.0.0.1:5050".to_string());

        let pdf_poll_interval_ms = env::var("PDF_POLL_INTERVAL_MS")
            .ok()
            .and_then(|x| x.parse::<u64>().ok())
            .unwrap_or(750);

        let pdf_max_poll_seconds = env::var("PDF_MAX_POLL_SECONDS")
            .ok()
            .and_then(|x| x.parse::<u64>().ok())
            .unwrap_or(120);

        Self {
            redis_url,
            redis_queue,
            pdf_service_base_url,
            pdf_poll_interval_ms,
            pdf_max_poll_seconds,
        }
    }
}
