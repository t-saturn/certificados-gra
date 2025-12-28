use std::sync::Arc;

use tokio::signal;
use tracing::info;

use file_svc::{
    config::Settings,
    router::create_router,
    shared::tracing::init_tracing,
    state::AppState,
    workers,
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load environment variables
    dotenvy::dotenv().ok();

    // Load configuration
    let settings = Settings::load()?;

    // Initialize tracing/logging
    let _guard = init_tracing(&settings.log)?;

    info!("Starting file-svc v{}", env!("CARGO_PKG_VERSION"));
    info!("Environment: {}", settings.environment);

    // Build application state
    let state = Arc::new(AppState::new(&settings).await?);

    // Spawn event workers (NATS listeners)
    let worker_state = Arc::clone(&state);
    tokio::spawn(async move {
        if let Err(e) = workers::start_workers(worker_state).await {
            tracing::error!("Worker error: {}", e);
        }
    });

    // Build router
    let app = create_router(Arc::clone(&state));

    // Start HTTP server
    let addr = format!("{}:{}", settings.http.host, settings.http.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    info!("HTTP server listening on http://{}", addr);

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    info!("Server shutdown complete");
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => info!("Received Ctrl+C, shutting down..."),
        _ = terminate => info!("Received terminate signal, shutting down..."),
    }
}
