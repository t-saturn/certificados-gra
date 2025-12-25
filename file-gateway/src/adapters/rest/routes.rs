use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use std::sync::Arc;
use tracing::info;

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct HealthQuery {
    pub db: Option<bool>,
}

pub fn router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(health))
        .with_state(state)
}

async fn health(
    State(state): State<Arc<AppState>>,
    Query(q): Query<HealthQuery>,
) -> Json<serde_json::Value> {
    let db = q.db.unwrap_or(false);
    info!(db, "health requested");

    // Por ahora: health local (rápido para validar server)
    // Próximo: proxy a FILE_BASE_URL/health y si db=true, ?db=true
    let mut data = serde_json::json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });

    // opcional: ping redis cuando db=true para sanity
    if db {
        let mut conn = match state.redis.pool().get().await {
            Ok(c) => c,
            Err(_) => {
                return Json(serde_json::json!({
                    "data": { "status": "degraded", "redis": { "status": "down" } },
                    "status": "success",
                    "message": "ok"
                }));
            }
        };

        let pong: Result<String, _> = redis::cmd("PING").query_async(&mut *conn).await;
        let redis_status = if pong.is_ok() { "up" } else { "down" };

        data["redis"] = serde_json::json!({ "status": redis_status });
    }


    Json(serde_json::json!({
        "data": data,
        "status": "success",
        "message": "ok"
    }))
}
