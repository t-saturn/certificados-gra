use axum::{
    Json, Router,
    extract::{Query, State},
    http::StatusCode,
    routing::get,
};
use serde::Deserialize;
use std::sync::Arc;
use tracing::{info, warn};

use crate::bootstrap::AppState;

#[derive(Debug, Deserialize)]
pub struct HealthQuery {
    pub db: Option<bool>,
}

pub fn router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(health_proxy))
        .with_state(state)
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

            // intentamos leer JSON upstream
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
