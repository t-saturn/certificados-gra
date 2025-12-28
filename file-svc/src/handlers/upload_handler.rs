use std::sync::Arc;

use axum::{
    extract::{Multipart, State},
    Json,
};
use bytes::Bytes;
use tracing::{info, instrument};

use crate::dto::{ApiResponse, UploadParams};
use crate::error::{AppError, Result};
use crate::models::FileInfo;
use crate::state::AppState;

/// POST /upload
/// Multipart form with: user_id, is_public, file
/// NOTE: project_id comes from server config (FILE_PROJECT_ID env var)
#[instrument(skip(state, multipart))]
pub async fn upload(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<FileInfo>>> {
    let mut user_id: Option<String> = None;
    let mut is_public: bool = true;
    let mut file_data: Option<(String, String, Bytes)> = None;

    // Parse multipart form
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
    {
        let name = field.name().unwrap_or_default().to_string();

        match name.as_str() {
            "user_id" => {
                user_id = Some(
                    field
                        .text()
                        .await
                        .map_err(|e| AppError::BadRequest(e.to_string()))?,
                );
            }
            "is_public" => {
                let value = field
                    .text()
                    .await
                    .map_err(|e| AppError::BadRequest(e.to_string()))?;
                is_public = value == "true" || value == "1";
            }
            "file" => {
                let file_name = field.file_name().unwrap_or("unknown").to_string();
                let content_type = field
                    .content_type()
                    .unwrap_or("application/octet-stream")
                    .to_string();
                let data = field
                    .bytes()
                    .await
                    .map_err(|e| AppError::BadRequest(e.to_string()))?;

                file_data = Some((file_name, content_type, data));
            }
            _ => {
                // Ignore unknown fields (including project_id if sent)
            }
        }
    }

    // Validate required fields
    let user_id = user_id.ok_or_else(|| AppError::MissingParam("user_id".to_string()))?;
    let (file_name, content_type, data) = file_data.ok_or(AppError::MissingFile)?;

    if data.is_empty() {
        return Err(AppError::MissingFile);
    }

    // Get project_id from config (not from request!)
    let project_id = state.settings().file_server.project_id.clone();

    let params = UploadParams {
        project_id,
        user_id,
        is_public,
    };

    info!(
        file_name = %file_name,
        content_type = %content_type,
        size = data.len(),
        project_id = %params.project_id,
        user_id = %params.user_id,
        "Processing upload request"
    );

    let upload_service = state.upload_service();
    let file_info = upload_service
        .upload(&params, &file_name, &content_type, data)
        .await?;

    Ok(Json(ApiResponse::success(
        file_info,
        "Archivo subido correctamente",
    )))
}
