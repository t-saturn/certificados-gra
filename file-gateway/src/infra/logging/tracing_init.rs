use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::prelude::*;
use tracing_subscriber::{fmt, EnvFilter};

/// Inicializa tracing:
/// - stdout pretty (dev)
/// - archivo JSON rotativo diario (para Loki a futuro)
pub fn init_tracing(log_dir: &str, log_file: &str) -> tracing_appender::non_blocking::WorkerGuard {
    std::fs::create_dir_all(log_dir).ok();

    let file_appender = RollingFileAppender::new(Rotation::DAILY, log_dir, log_file);
    let (file_writer, guard) = tracing_appender::non_blocking(file_appender);

    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    let file_layer = fmt::layer().with_writer(file_writer).json();
    let console_layer = fmt::layer().pretty();

    tracing_subscriber::registry()
        .with(filter)
        .with(file_layer)
        .with(console_layer)
        .init();

    guard
}
