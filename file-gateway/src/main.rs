mod adapters;
mod application;
mod bootstrap;
mod config;
mod domain;
mod infra;

#[tokio::main]
async fn main() {
    if let Err(e) = bootstrap::run().await {
        eprintln!("fatal: {:#}", e);
        std::process::exit(1);
    }
}
