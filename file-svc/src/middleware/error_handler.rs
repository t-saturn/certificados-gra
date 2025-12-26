use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

/// Global error handler middleware
pub async fn error_handler(err: Response) -> Response {
    let status = err.status();

    if status.is_client_error() || status.is_server_error() {
        let body = json!({
            "success": false,
            "message": status.canonical_reason().unwrap_or("Error"),
            "data": null,
            "error": {
                "code": format!("HTTP_{}", status.as_u16()),
                "details": status.canonical_reason().unwrap_or("Unknown error")
            }
        });

        return (status, Json(body)).into_response();
    }

    err
}

/// Handler for 404 Not Found
pub async fn not_found() -> impl IntoResponse {
    let body = json!({
        "success": false,
        "message": "Endpoint not found",
        "data": null,
        "error": {
            "code": "NOT_FOUND",
            "details": "The requested endpoint does not exist"
        }
    });

    (StatusCode::NOT_FOUND, Json(body))
}
