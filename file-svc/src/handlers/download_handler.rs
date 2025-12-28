use std::sync::Arc;

use axum::{
    body::Body,
    extract::{Query, State},
    http::{header, Response, StatusCode},
};
use tracing::instrument;
use uuid::Uuid;

use crate::dto::DownloadQuery;
use crate::error::{AppError, Result};
use crate::state::AppState;

/// GET /download?file_id=xxx
#[instrument(skip(state))]
pub async fn download(
    State(state): State<Arc<AppState>>,
    Query(query): Query<DownloadQuery>,
) -> Result<Response<Body>> {
    // Parse UUID from query param
    let file_id = Uuid::parse_str(&query.file_id)
        .map_err(|_| AppError::InvalidUuid(query.file_id.clone()))?;

    // Get project_id from config
    let project_id = &state.settings().file_server.project_id;
    let user_id = "anonymous"; // TODO: Get from auth context

    let download_service = state.download_service();
    let result = download_service
        .download(&file_id, project_id, user_id)
        .await?;

    // Build response with file
    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, result.content_type)
        .header(header::CONTENT_DISPOSITION, result.content_disposition)
        .header(header::CONTENT_LENGTH, result.data.len())
        .body(Body::from(result.data))
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(response)
}
