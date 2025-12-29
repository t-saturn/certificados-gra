use std::path::Path;

use tracing_appender::{non_blocking::WorkerGuard, rolling};
use tracing_subscriber::{
    fmt::{self, format::FmtSpan},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter,
};

use crate::config::LogConfig;

/// Initialize tracing with file and console output
/// Returns a guard that must be kept alive for the duration of the program
pub fn init_tracing(config: &LogConfig) -> anyhow::Result<WorkerGuard> {
    // Create log directory if it doesn't exist
    let log_dir = Path::new(&config.dir);
    if !log_dir.exists() {
        std::fs::create_dir_all(log_dir)?;
    }

    // Setup file appender with daily rotation
    let file_appender = rolling::daily(&config.dir, &config.file);
    let (non_blocking_file, guard) = tracing_appender::non_blocking(file_appender);

    // Environment filter from RUST_LOG
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,file_svc=debug"));

    // Console layer (pretty format for development)
    let console_layer = fmt::layer()
        .with_target(true)
        .with_thread_ids(false)
        .with_thread_names(false)
        .with_file(true)
        .with_line_number(true)
        .with_span_events(FmtSpan::CLOSE)
        .pretty();

    // File layer (JSON format for production/parsing)
    let file_layer = fmt::layer()
        .with_target(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .with_ansi(false)
        .json()
        .with_writer(non_blocking_file);

    // Combine layers
    tracing_subscriber::registry()
        .with(env_filter)
        .with(console_layer)
        .with(file_layer)
        .init();

    Ok(guard)
}

/// Create a span for request tracing
#[macro_export]
macro_rules! request_span {
    ($method:expr, $path:expr) => {
        tracing::info_span!(
            "request",
            method = %$method,
            path = %$path,
            request_id = %uuid::Uuid::new_v4()
        )
    };
}
