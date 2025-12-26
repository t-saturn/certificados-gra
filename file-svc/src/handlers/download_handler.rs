use std::sync::Arc;

use axum::{
    body::Body,
    extract::{Path, State},
    http::{header, Response, StatusCode},
};
use tracing::instrument;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::state::AppState;

/// GET /download/:id
#[instrument(skip(state))]
pub async fn download(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Response<Body>> {
    // Parse UUID
    let file_id = Uuid::parse_str(&id).map_err(|_| AppError::InvalidUuid(id.clone()))?;

    // TODO: Get project_id and user_id from auth context
    let project_id = "default";
    let user_id = "anonymous";

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
