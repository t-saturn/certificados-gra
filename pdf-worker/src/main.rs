mod config;
mod domain;
mod application;
mod infrastructure;

use dotenvy::dotenv;
use config::Config;
use infrastructure::redis::queue::RedisQueue;
use application::worker::Worker;

use tracing::info;
use tracing_subscriber::{fmt, EnvFilter};

fn init_tracing() {
    // Si setea RUST_LOG en tu .env, lo respeta. Si no, default.
    // Ej: RUST_LOG=pdf_worker=debug,redis=info
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    fmt()
        .with_env_filter(filter)
        .with_target(true)     // muestra módulo
        .with_level(true)      // muestra level
        .with_line_number(true)
        .compact()
        .init();
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    init_tracing();

    let cfg = Config::from_env();

    info!(queue = %cfg.redis_queue, redis_url = %cfg.redis_url, "PDF Worker starting");

    // Conexión + log descriptivo adentro
    let queue = RedisQueue::connect(&cfg.redis_url, &cfg.redis_queue).await?;
    let worker = Worker::new(queue);

    info!(queue = %cfg.redis_queue, "Worker ready: listening for jobs");
    worker.run().await
}
