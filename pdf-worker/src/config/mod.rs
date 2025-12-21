use std::env;

#[derive(Clone)]
pub struct Config {
    pub redis_url: String,
    pub redis_queue: String,
}

impl Config {
    pub fn from_env() -> Self {
        let host = env::var("REDIS_HOST").expect("REDIS_HOST missing");
        let port = env::var("REDIS_PORT").expect("REDIS_PORT missing");
        let db = env::var("REDIS_DB").unwrap_or_else(|_| "0".into());

        Self {
            redis_url: format!("redis://{}:{}/{}", host, port, db),
            redis_queue: env::var("REDIS_QUEUE_PDF_JOBS").expect("REDIS_QUEUE_PDF_JOBS missing"),
        }
    }
}
