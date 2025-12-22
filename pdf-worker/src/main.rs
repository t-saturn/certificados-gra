mod application;
mod config;
mod domain;
mod infrastructure;
mod shared;

use dotenvy::dotenv;
use tracing::info;

use application::worker::Worker;
use config::Config;
use infrastructure::db::{documents_repo::DocumentsRepository, pool};
use infrastructure::redis::queue::RedisQueue;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    let _log_guard = shared::logging::init_tracing()?;

    let cfg = Config::from_env();

    info!(queue = %cfg.redis_queue, redis_url = %cfg.redis_url, "PDF Worker starting");

    let redis_queue = RedisQueue::connect(&cfg.redis_url, &cfg.redis_queue).await?;
    let pg_pool = pool::connect(&cfg.pg_url).await?;
    let docs_repo = DocumentsRepository::new(pg_pool);

    let worker = Worker::new(redis_queue, docs_repo);

    info!(queue = %cfg.redis_queue, "Worker ready: listening for jobs");
    worker.run().await
}
