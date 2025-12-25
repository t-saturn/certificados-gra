use std::{fs::OpenOptions, path::PathBuf};
use tracing_subscriber::prelude::*;
use tracing_subscriber::{EnvFilter, fmt};

pub fn init_tracing(log_dir: &str) -> std::io::Result<()> {
    std::fs::create_dir_all(log_dir)?;

    // Nombre: YYYY-MM-DD.log (hora local del servidor)
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let mut path = PathBuf::from(log_dir);
    path.push(format!("{today}.log"));

    let file = OpenOptions::new().create(true).append(true).open(path)?;

    let (file_writer, guard) = tracing_appender::non_blocking(file);

    // Guard debe mantenerse vivo; lo guardamos en un static para evitar que se dropee
    // (o mejor: devuélvelo y guárdalo en bootstrap)
    keep_guard_alive(guard);

    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    let timer = fmt::time::LocalTime::rfc_3339();

    let console_layer = fmt::layer()
        .with_timer(timer.clone())
        .with_target(true)
        .with_file(true)
        .with_line_number(true)
        .with_level(true)
        .with_ansi(true)
        .compact();

    let file_layer = fmt::layer()
        .with_timer(timer)
        .with_target(true)
        .with_file(true)
        .with_line_number(true)
        .with_level(true)
        .with_ansi(false)
        .with_writer(file_writer)
        .compact();

    tracing_subscriber::registry()
        .with(filter)
        .with(console_layer)
        .with(file_layer)
        .init();

    Ok(())
}

// Mantener guard vivo sin ensuciar main
fn keep_guard_alive(_guard: tracing_appender::non_blocking::WorkerGuard) {
    // Leak intencional para mantener el background worker vivo durante la vida del proceso
    Box::leak(Box::new(_guard));
}
