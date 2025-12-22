mod application;
mod config;
mod domain;
mod infrastructure;
mod shared;

use dotenvy::dotenv;
use tracing::info;

use application::worker::Worker;
use config::Config;
use infrastructure::pdf_service::client::PdfServiceClient;
use infrastructure::redis::queue::RedisQueue;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    let _log_guard = shared::logging::init_tracing()?;

    let cfg = Config::from_env();

    info!(
        queue = %cfg.redis_queue,
        redis_url = %cfg.redis_url,
        pdf_service_base_url = %cfg.pdf_service_base_url,
        "PDF Worker starting"
    );

    let redis_queue = RedisQueue::connect(&cfg.redis_url, &cfg.redis_queue).await?;
    let pdf_client = PdfServiceClient::new(cfg.pdf_service_base_url.clone());

    let worker = Worker::new(
        redis_queue,
        pdf_client,
        cfg.pdf_poll_interval_ms,
        cfg.pdf_max_poll_seconds,
    );

    info!(queue = %cfg.redis_queue, "Worker ready: listening for jobs");
    worker.run().await
}
