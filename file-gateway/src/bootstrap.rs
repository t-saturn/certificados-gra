use anyhow::{Context, Result};
use std::{net::SocketAddr, sync::Arc, time::Duration};
use tower_http::trace::TraceLayer;
use tracing::Level;
use tracing::info;

use crate::application::services::file_service::FileService;
use crate::infra::http::file_server_repository::HttpFileRepository;
use crate::{adapters, config::settings::Settings, infra};

pub struct AppState {
    pub settings: Settings,
    pub redis: infra::redis::RedisClient,
    pub http: reqwest::Client,
    pub file_service: FileService,
}

pub async fn run() -> Result<()> {
    let settings = Settings::from_env().context("loading settings from env")?;

    // logging
    let _guard = infra::logging::init_tracing(&settings.log_dir)?;

    // http client
    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .pool_idle_timeout(Duration::from_secs(60))
        .build()
        .context("building http client")?;

    // redis pool
    let redis = infra::redis::RedisClient::new(&settings.redis_url())
        .await
        .context("creating redis pool")?;

    //  fail-fast redis ping
    verify_redis(&redis).await.context("redis ping failed")?;

    info!(
      http_addr = %settings.http_addr(),
      redis = %format!("{}:{}/{}", settings.redis_host, settings.redis_port, settings.redis_db),
      nats_url = %settings.nats_url,
      "File Gateway starting"
    );

    info!("Redis connected successfully");

    let repo = HttpFileRepository::new(http.clone(), settings.file_public_url.clone());
    let file_service = FileService::new(Arc::new(repo));

    let state = Arc::new(AppState {
        settings: settings.clone(),
        redis,
        http,
        file_service,
    });

    let app = adapters::rest::routes::router(state).layer(
        TraceLayer::new_for_http()
            .make_span_with(|req: &axum::http::Request<_>| {
                tracing::span!(
                    Level::INFO,
                    "http_request",
                    method = %req.method(),
                    uri = %req.uri(),
                )
            })
            .on_request(|_req: &axum::http::Request<_>, _span: &tracing::Span| {
                tracing::info!("request started");
            })
            .on_response(
                |res: &axum::http::Response<_>,
                 latency: std::time::Duration,
                 _span: &tracing::Span| {
                    tracing::info!(
                        status = %res.status(),
                        latency_ms = latency.as_millis(),
                        "request finished"
                    );
                },
            )
            .on_failure(
                |err: tower_http::classify::ServerErrorsFailureClass,
                 latency: std::time::Duration,
                 _span: &tracing::Span| {
                    tracing::warn!(
                        error = %err,
                        latency_ms = latency.as_millis(),
                        "request failed"
                    );
                },
            ),
    );

    let addr: SocketAddr = settings.http_addr().parse().context("invalid http addr")?;
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .context("bind http")?;

    info!("Gateway ready: listening on {}", addr);

    axum::serve(listener, app.into_make_service())
        .await
        .context("axum serve failed")?;

    Ok(())
}

async fn verify_redis(redis: &infra::redis::RedisClient) -> Result<()> {
    let mut conn = redis.pool().get().await.context("bb8 get redis conn")?;

    let pong: String = redis::cmd("PING")
        .query_async(&mut *conn)
        .await
        .context("redis PING")?;

    anyhow::ensure!(pong == "PONG", "unexpected redis response: {}", pong);
    Ok(())
}
