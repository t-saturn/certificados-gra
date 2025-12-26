use axum::{
    Json, Router,
    body::Body,
    extract::{Multipart, Path, Query, State},
    http::{Response, StatusCode, header},
    routing::{get, post},
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
        .route("/api/v1/files", post(upload_file))
        .route("/jobs/:job_id", get(get_job))
        .fallback(not_found)
        .with_state(state)
}

async fn not_found(uri: axum::http::Uri) -> (StatusCode, Json<serde_json::Value>) {
    warn!(%uri, "route not found");
    (
        StatusCode::NOT_FOUND,
        Json(serde_json::json!({
            "success": false,
            "message": "Ruta no encontrada",
            "data": null,
            "error": {
                "code": "ROUTE_NOT_FOUND",
                "details": format!("No existe la ruta {}", uri)
            }
        })),
    )
}

#[derive(Debug, Deserialize)]
pub struct HealthQuery {
    pub db: Option<bool>,
}

async fn download_public(
    State(state): State<Arc<AppState>>,
    Path(file_id): Path<String>,
) -> Result<Response<Body>, (StatusCode, Json<serde_json::Value>)> {
    let file_id = Uuid::parse_str(&file_id).map_err(|e| {
        warn!(error=%e, raw_file_id=%file_id, "invalid uuid");
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "ID inválido",
                "data": null,
                "error": {
                    "code": "INVALID_UUID",
                    "details": "El ID del archivo debe ser un UUID válido"
                }
            })),
        )
    })?;

    info!(file_id=%file_id, "download public requested");

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

async fn upload_file(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<serde_json::Value>)> {
    let mut user_id: Option<String> = None;
    let mut is_public: bool = true;

    let mut filename: Option<String> = None;
    let mut content_type: Option<String> = None;
    let mut content: Option<Vec<u8>> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "Multipart inválido",
                "data": null,
                "error": { "code": "INVALID_MULTIPART", "details": e.to_string() }
            })),
        )
    })? {
        let name = field.name().unwrap_or("").to_string();

        match name.as_str() {
            "user_id" => {
                user_id = Some(field.text().await.unwrap_or_default());
            }
            "is_public" => {
                let v = field.text().await.unwrap_or_default();
                is_public = v == "true" || v == "1";
            }
            "file" => {
                filename = field.file_name().map(|s| s.to_string());
                content_type = field.content_type().map(|s| s.to_string());
                content = Some(field.bytes().await.map(|b| b.to_vec()).unwrap_or_default());
            }
            _ => {
                // ignorar campos no usados (project_id no lo aceptamos, viene de env)
            }
        }
    }

    let cmd = crate::application::dtos::UploadFileCommand {
        user_id: user_id.unwrap_or_default(),
        is_public,
        filename: filename.unwrap_or_else(|| "file.bin".into()),
        content_type: content_type.unwrap_or_else(|| "application/octet-stream".into()),
        content: content.unwrap_or_default(),
    };

    let out = state.file_service.upload_file(cmd).await.map_err(|e| {
        (
            StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({
                "success": false,
                "message": "Upstream error",
                "data": null,
                "error": { "code": "UPSTREAM_ERROR", "details": e.to_string() }
            })),
        )
    })?;

    Ok((
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "success",
            "message": "Archivo subido correctamente",
            "data": {
                "id": out.id,
                "original_name": out.original_name,
                "size": out.size,
                "mime_type": out.mime_type,
                "is_public": out.is_public,
                "created_at": out.created_at
            }
        })),
    ))
}

async fn get_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<String>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<serde_json::Value>)> {
    // validar UUID (opcional pero recomendado)
    if Uuid::parse_str(&job_id).is_err() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "status": "failed",
                "message": "ID inválido",
                "data": null,
                "error": {
                    "code": "INVALID_UUID",
                    "details": "El ID del job debe ser un UUID válido"
                }
            })),
        ));
    }

    info!(%job_id, "get job status");

    match state.job_service.get_job_status(&job_id).await {
        Ok(Some(dto)) => Ok((
            StatusCode::OK,
            Json(serde_json::json!({
                "status": "success",
                "message": "ok",
                "data": dto
            })),
        )),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "status": "failed",
                "message": "Job not found",
                "data": null
            })),
        )),
        Err(e) => Err((
            StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({
                "status": "failed",
                "message": "Upstream error",
                "data": { "detail": e }
            })),
        )),
    }
}
