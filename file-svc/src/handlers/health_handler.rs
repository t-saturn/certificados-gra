use std::sync::Arc;

use axum::{extract::Query, extract::State, Json};
use tracing::instrument;

use crate::dto::{ApiResponse, HealthQuery};
use crate::error::Result;
use crate::models::HealthStatus;
use crate::state::AppState;

/// GET /health
/// GET /health?db=true
/// GET /health?full=true
#[instrument(skip(state))]
pub async fn health(
    State(state): State<Arc<AppState>>,
    Query(query): Query<HealthQuery>,
) -> Result<Json<ApiResponse<HealthStatus>>> {
    let health_service = state.health_service();

    let health = if query.full {
        health_service.check_full().await?
    } else if query.db {
        health_service.check_with_db(true).await?
    } else {
        health_service.check().await?
    };

    Ok(Json(ApiResponse::success(health, "ok")))
}
