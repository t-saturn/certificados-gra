use axum::{
    Json, Router,
    body::Body,
    extract::{Path, Query, State},
    http::{Response, StatusCode, header},
    routing::get,
};
use serde::Deserialize;
use std::sync::Arc;
use tracing::{info, warn};
use uuid::Uuid;

use crate::bootstrap::AppState;
use crate::domain::errors::DomainError;

pub fn router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(health_proxy))
        .route("/public/files/:file_id", get(download_public))
        .with_state(state)
}

#[derive(Debug, Deserialize)]
pub struct HealthQuery {
    pub db: Option<bool>,
}

async fn download_public(
    State(state): State<Arc<AppState>>,
    Path(file_id): Path<String>,
) -> Result<Response<Body>, (StatusCode, Json<serde_json::Value>)> {
    let file_id = Uuid::parse_str(&file_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "status": "failed",
                "message": "Invalid file_id",
                "data": null
            })),
        )
    })?;

    let result = state.file_service.download_public(file_id).await;

    match result {
        Ok(file) => {
            // Streaming response (sin cargar a memoria)
            let mut resp = Response::new(Body::from_stream(file.stream));
            *resp.status_mut() = StatusCode::OK;

            resp.headers_mut()
                .insert(header::CONTENT_TYPE, file.content_type.parse().unwrap());

            if let Some(len) = file.content_length {
                resp.headers_mut()
                    .insert(header::CONTENT_LENGTH, len.to_string().parse().unwrap());
            }

            Ok(resp)
        }
        Err(DomainError::NotFound) => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "status": "failed",
                "message": "File not found",
                "data": null
            })),
        )),
        Err(DomainError::BadRequest(msg)) => Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "status": "failed",
                "message": msg,
                "data": null
            })),
        )),
        Err(DomainError::Upstream(msg)) => Err((
            StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({
                "status": "failed",
                "message": "Upstream error",
                "data": { "detail": msg }
            })),
        )),
    }
}

async fn health_proxy(
    State(state): State<Arc<AppState>>,
    Query(q): Query<HealthQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    let db = q.db.unwrap_or(false);

    let mut url = format!(
        "{}/health",
        state.settings.file_base_url.trim_end_matches('/')
    );
    if db {
        url.push_str("?db=true");
    }

    info!(%url, db, "proxy health");

    match state.http.get(url).send().await {
        Ok(resp) => {
            let status =
                StatusCode::from_u16(resp.status().as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);

            match resp.json::<serde_json::Value>().await {
                Ok(json) => (status, Json(json)),
                Err(e) => {
                    warn!(error=%e, "upstream health not json");
                    (
                        StatusCode::BAD_GATEWAY,
                        Json(serde_json::json!({
                            "status": "failed",
                            "message": "Upstream health invalid JSON",
                            "data": null
                        })),
                    )
                }
            }
        }
        Err(e) => {
            warn!(error=%e, "upstream health unreachable");
            (
                StatusCode::BAD_GATEWAY,
                Json(serde_json::json!({
                    "status": "failed",
                    "message": "Upstream health unreachable",
                    "data": null
                })),
            )
        }
    }
}
