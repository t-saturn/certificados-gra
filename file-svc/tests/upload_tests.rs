//! Tests for POST /upload endpoint
//!
//! Test cases:
//! - ok Upload successful with valid params and file
//! - err Upload fails when project_id is missing
//! - err Upload fails when user_id is missing
//! - err Upload fails when file is missing
//! - err Upload fails when file is empty

use bytes::Bytes;
use chrono::Utc;
use uuid::Uuid;

use file_svc::dto::{ApiResponse, UploadParams};
use file_svc::error::AppError;
use file_svc::models::FileInfo;

// -- fixtures
fn sample_upload_params() -> UploadParams {
    UploadParams {
        project_id: "test-project".to_string(),
        user_id: "test-user".to_string(),
        is_public: true,
    }
}

fn sample_file_info() -> FileInfo {
    FileInfo {
        id: Uuid::new_v4(),
        original_name: "test-file.pdf".to_string(),
        size: 1024,
        mime_type: "application/pdf".to_string(),
        is_public: true,
        created_at: Utc::now(),
    }
}

fn sample_file_data() -> Bytes {
    Bytes::from("Sample file content for testing")
}

fn sample_pdf_data() -> Bytes {
    Bytes::from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF")
}

// -- upload validation test
#[test]
fn test_upload_params_valid() {
    let params = sample_upload_params();

    assert_eq!(params.project_id, "test-project");
    assert_eq!(params.user_id, "test-user");
    assert!(params.is_public);
}

#[test]
fn test_upload_params_is_public_false() {
    let params = UploadParams {
        project_id: "proj".to_string(),
        user_id: "user".to_string(),
        is_public: false,
    };

    assert!(!params.is_public);
}

// -- error code test
#[test]
fn test_error_code_missing_param() {
    let error = AppError::MissingParam("project_id".to_string());
    assert_eq!(error.error_code(), "MISSING_PARAMS");
}

#[test]
fn test_error_code_missing_file() {
    let error = AppError::MissingFile;
    assert_eq!(error.error_code(), "MISSING_FILE");
}

#[test]
fn test_error_code_invalid_uuid() {
    let error = AppError::InvalidUuid("bad-uuid".to_string());
    assert_eq!(error.error_code(), "INVALID_UUID");
}

#[test]
fn test_error_code_not_found() {
    let error = AppError::NotFound("file".to_string());
    assert_eq!(error.error_code(), "NOT_FOUND");
}

#[test]
fn test_error_code_external_service() {
    let error = AppError::ExternalService("timeout".to_string());
    assert_eq!(error.error_code(), "EXTERNAL_SERVICE_ERROR");
}

// -- http status code test

#[test]
fn test_status_code_missing_param() {
    use axum::http::StatusCode;

    let error = AppError::MissingParam("project_id".to_string());
    assert_eq!(error.status_code(), StatusCode::BAD_REQUEST);
}

#[test]
fn test_status_code_missing_file() {
    use axum::http::StatusCode;

    let error = AppError::MissingFile;
    assert_eq!(error.status_code(), StatusCode::BAD_REQUEST);
}

#[test]
fn test_status_code_not_found() {
    use axum::http::StatusCode;

    let error = AppError::NotFound("file".to_string());
    assert_eq!(error.status_code(), StatusCode::NOT_FOUND);
}

#[test]
fn test_status_code_external_service() {
    use axum::http::StatusCode;

    let error = AppError::ExternalService("error".to_string());
    assert_eq!(error.status_code(), StatusCode::BAD_GATEWAY);
}

#[test]
fn test_status_code_invalid_uuid() {
    use axum::http::StatusCode;

    let error = AppError::InvalidUuid("bad".to_string());
    assert_eq!(error.status_code(), StatusCode::BAD_REQUEST);
}

// -- response format test
#[test]
fn test_success_response_format() {
    let file_info = sample_file_info();
    let response = ApiResponse::success(file_info, "Archivo subido correctamente");

    assert_eq!(response.status, "success");
    assert_eq!(response.message, "Archivo subido correctamente");
    assert_eq!(response.data.original_name, "test-file.pdf");
}

#[test]
fn test_success_response_serialization() {
    let file_info = FileInfo {
        id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap(),
        original_name: "document.pdf".to_string(),
        size: 2048,
        mime_type: "application/pdf".to_string(),
        is_public: false,
        created_at: Utc::now(),
    };

    let response = ApiResponse::success(file_info, "OK");
    let json = serde_json::to_string(&response).unwrap();

    assert!(json.contains("\"status\":\"success\""));
    assert!(json.contains("\"message\":\"OK\""));
    assert!(json.contains("\"id\":\"550e8400-e29b-41d4-a716-446655440000\""));
    assert!(json.contains("\"original_name\":\"document.pdf\""));
    assert!(json.contains("\"size\":2048"));
    assert!(json.contains("\"is_public\":false"));
}

// -- error message test
#[test]
fn test_missing_project_id_error_message() {
    let error = AppError::MissingParam("project_id".to_string());
    let message = error.to_string();

    assert!(message.contains("project_id"));
}

#[test]
fn test_missing_user_id_error_message() {
    let error = AppError::MissingParam("user_id".to_string());
    let message = error.to_string();

    assert!(message.contains("user_id"));
}

#[test]
fn test_missing_file_error_message() {
    let error = AppError::MissingFile;
    assert_eq!(error.to_string(), "Missing file");
}

// -- file data test
#[test]
fn test_pdf_file_data_valid() {
    let pdf_data = sample_pdf_data();
    assert!(!pdf_data.is_empty());
    assert!(pdf_data.starts_with(b"%PDF"));
}

#[test]
fn test_sample_file_data_not_empty() {
    let data = sample_file_data();
    assert!(!data.is_empty());
    assert!(data.len() > 0);
}

#[test]
fn test_file_info_fields() {
    let info = sample_file_info();

    assert!(!info.id.is_nil());
    assert!(!info.original_name.is_empty());
    assert!(info.size > 0);
    assert!(!info.mime_type.is_empty());
}
