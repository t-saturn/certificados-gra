use std::sync::Arc;

use axum::{
    middleware,
    routing::{get, post},
    Router,
};
use tower_http::trace::TraceLayer;

use crate::handlers;
use crate::middleware::request_logger;
use crate::state::AppState;

/// Create the application router
pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        // Health endpoint
        .route("/health", get(handlers::health))
        // File operations
        .route("/upload", post(handlers::upload))
        // Download with query param: GET /download?file_id=xxx
        .route("/download", get(handlers::download))
        // Fallback for 404
        .fallback(crate::middleware::error_handler::not_found)
        // Middleware
        .layer(middleware::from_fn(request_logger))
        .layer(TraceLayer::new_for_http())
        // State
        .with_state(state)
}
