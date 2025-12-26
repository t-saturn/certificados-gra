use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

/// Application error types
#[derive(Error, Debug)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Invalid UUID: {0}")]
    InvalidUuid(String),

    #[error("Missing required parameter: {0}")]
    MissingParam(String),

    #[error("Missing file")]
    MissingFile,

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("External service error: {0}")]
    ExternalService(String),

    #[error("Redis error: {0}")]
    Redis(#[from] redis::RedisError),

    #[error("NATS error: {0}")]
    Nats(String),

    #[error("HTTP client error: {0}")]
    HttpClient(#[from] reqwest::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl AppError {
    pub fn error_code(&self) -> &'static str {
        match self {
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::BadRequest(_) => "BAD_REQUEST",
            AppError::InvalidUuid(_) => "INVALID_UUID",
            AppError::MissingParam(_) => "MISSING_PARAMS",
            AppError::MissingFile => "MISSING_FILE",
            AppError::Unauthorized(_) => "UNAUTHORIZED",
            AppError::ExternalService(_) => "EXTERNAL_SERVICE_ERROR",
            AppError::Redis(_) => "REDIS_ERROR",
            AppError::Nats(_) => "NATS_ERROR",
            AppError::HttpClient(_) => "HTTP_CLIENT_ERROR",
            AppError::Serialization(_) => "SERIALIZATION_ERROR",
            AppError::Internal(_) => "INTERNAL_ERROR",
        }
    }

    pub fn status_code(&self) -> StatusCode {
        match self {
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::BadRequest(_) | AppError::InvalidUuid(_) => StatusCode::BAD_REQUEST,
            AppError::MissingParam(_) | AppError::MissingFile => StatusCode::BAD_REQUEST,
            AppError::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            AppError::ExternalService(_) => StatusCode::BAD_GATEWAY,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let body = json!({
            "success": false,
            "message": self.to_string(),
            "data": null,
            "error": {
                "code": self.error_code(),
                "details": self.to_string()
            }
        });

        tracing::error!(
            error_code = self.error_code(),
            error_message = %self,
            "Request failed"
        );

        (status, Json(body)).into_response()
    }
}

/// Result type alias for convenience
pub type Result<T> = std::result::Result<T, AppError>;
