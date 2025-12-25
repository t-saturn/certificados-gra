mod config;
mod infra;
mod adapters;

use std::{net::SocketAddr, sync::Arc};
use tracing::{info, error};

use crate::config::settings::Settings;
use crate::infra::redis::RedisClient;

pub struct AppState {
    pub settings: Settings,
    pub redis: RedisClient,
}

impl AppState {
    pub async fn redis_conn(&self) -> Result<infra::redis::RedisConn, redis::RedisError> {
        self.redis.connect().await
    }
}

#[tokio::main]
async fn main() {
    // 1) Settings
    let settings = match Settings::from_env() {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Error cargando config/env: {e}");
            std::process::exit(1);
        }
    };

    // 2) Logging/tracing
    let _log_guard = infra::logging::init_tracing(&settings.log_dir, &settings.log_file);
    info!("starting file-gateway");

    // 3) Redis client
    let redis = match RedisClient::new(&settings.redis_url()) {
        Ok(c) => c,
        Err(e) => {
            error!(error = %e, "failed to create redis client");
            std::process::exit(1);
        }
    };

    let state = Arc::new(AppState { settings: settings.clone(), redis });

    // 4) Router
    let app = adapters::rest::routes::router(state);

    // 5) Run server
    let addr: SocketAddr = settings.http_addr().parse().expect("invalid HTTP_HOST/HTTP_PORT");
    info!(%addr, "HTTP listening");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
