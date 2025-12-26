use axum::{
    body::Body,
    extract::Request,
    middleware::Next,
    response::Response,
};
use std::time::Instant;
use tracing::{info, Span};
use uuid::Uuid;

/// Request logging middleware
pub async fn request_logger(request: Request<Body>, next: Next) -> Response {
    let request_id = Uuid::new_v4().to_string();
    let method = request.method().clone();
    let uri = request.uri().clone();
    let path = uri.path().to_string();

    let span = tracing::info_span!(
        "request",
        request_id = %request_id,
        method = %method,
        path = %path,
    );

    let _guard = span.enter();

    info!("Request started");

    let start = Instant::now();
    let response = next.run(request).await;
    let elapsed = start.elapsed();

    let status = response.status();

    info!(
        status = %status.as_u16(),
        duration_ms = %elapsed.as_millis(),
        "Request completed"
    );

    response
}
