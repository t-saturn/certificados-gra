use chrono::Local;
use std::{fs, path::PathBuf};

use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::prelude::*;
use tracing_subscriber::{EnvFilter, fmt};

pub fn init_tracing() -> anyhow::Result<WorkerGuard> {
    let log_dir = PathBuf::from("logs");
    fs::create_dir_all(&log_dir)?;

    let date = Local::now().format("%Y-%m-%d").to_string();
    let file_name = format!("{}.log", date);

    let file_appender = tracing_appender::rolling::never(&log_dir, file_name);
    let (file_writer, guard) = tracing_appender::non_blocking(file_appender);

    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    let console_layer = fmt::layer()
        .with_target(true)
        .with_level(true)
        .with_line_number(true)
        .compact();

    let file_layer = fmt::layer()
        .with_writer(file_writer)
        .with_target(true)
        .with_level(true)
        .with_line_number(true)
        .with_ansi(false); // en archivo NO ansi

    tracing_subscriber::registry()
        .with(filter)
        .with(console_layer)
        .with(file_layer)
        .init();

    Ok(guard)
}
