use std::env;

#[derive(Clone)]
pub struct Config {
    pub redis_url: String,
    pub redis_queue: String,

    pub pg_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        let redis_host = env::var("REDIS_HOST").expect("REDIS_HOST missing");
        let redis_port = env::var("REDIS_PORT").expect("REDIS_PORT missing");
        let redis_db = env::var("REDIS_DB").unwrap_or_else(|_| "0".into());
        let redis_queue = env::var("REDIS_QUEUE_PDF_JOBS").expect("REDIS_QUEUE_PDF_JOBS missing");

        let pg_host = env::var("PG_HOST").expect("PG_HOST missing");
        let pg_port = env::var("PG_PORT").unwrap_or_else(|_| "5432".into());
        let pg_user = env::var("PG_USER").expect("PG_USER missing");
        let pg_password = env::var("PG_PASSWORD").expect("PG_PASSWORD missing");
        let pg_database = env::var("PG_DATABASE").expect("PG_DATABASE missing");
        let pg_sslmode = env::var("PG_SSLMODE").unwrap_or_else(|_| "disable".into());

        let pg_url = format!(
            "postgres://{}:{}@{}:{}/{}?sslmode={}",
            pg_user, pg_password, pg_host, pg_port, pg_database, pg_sslmode
        );

        Self {
            redis_url: format!("redis://{}:{}/{}", redis_host, redis_port, redis_db),
            redis_queue,
            pg_url,
        }
    }
}
