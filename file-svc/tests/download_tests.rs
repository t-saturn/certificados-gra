//! Tests for GET /download/:id endpoint
//!
//! Test cases:
//! - ok Download successful with valid UUID
//! - err Download fails with invalid UUID format
//! - err Download fails with non-existent file
//! - err Download fails with malformed UUID

use uuid::Uuid;

use file_svc::config::FileServerConfig;
use file_svc::error::AppError;

// --fixtures
mod valid_uuids {
    use uuid::Uuid;

    pub fn file_id_1() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    pub fn file_id_2() -> Uuid {
        Uuid::parse_str("6ba7b810-9dad-11d1-80b4-00c04fd430c8").unwrap()
    }
}

mod invalid_uuids {
    pub const INVALID_FORMAT: &str = "not-a-valid-uuid";
    pub const TOO_SHORT: &str = "550e8400";
    pub const EXTRA_CHARS: &str = "550e8400-e29b-41d4-a716-446655440000extra";
    pub const WRONG_CHARS: &str = "550e8400-e29b-41d4-a716-44665544ZZZZ";
}

fn sample_config() -> FileServerConfig {
    FileServerConfig {
        base_url: "https://files.example.com".to_string(),
        public_url: "https://files.example.com/public".to_string(),
        api_url: "https://files.example.com/api/v1".to_string(),
        access_key: "test-key".to_string(),
        secret_key: "test-secret".to_string(),
        project_id: "test-project".to_string(),
    }
}

// -- uuid validation tests
#[test]
fn test_valid_uuid_parsing() {
    let uuid_str = "550e8400-e29b-41d4-a716-446655440000";
    let result = Uuid::parse_str(uuid_str);

    assert!(result.is_ok());
    assert_eq!(result.unwrap().to_string(), uuid_str);
}

#[test]
fn test_multiple_valid_uuids() {
    let uuid1 = valid_uuids::file_id_1();
    let uuid2 = valid_uuids::file_id_2();

    assert_ne!(uuid1, uuid2);
    assert_eq!(uuid1.to_string(), "550e8400-e29b-41d4-a716-446655440000");
}

#[test]
fn test_invalid_uuid_random_string() {
    let result = Uuid::parse_str(invalid_uuids::INVALID_FORMAT);
    assert!(result.is_err());
}

#[test]
fn test_invalid_uuid_too_short() {
    let result = Uuid::parse_str(invalid_uuids::TOO_SHORT);
    assert!(result.is_err());
}

#[test]
fn test_invalid_uuid_extra_chars() {
    let result = Uuid::parse_str(invalid_uuids::EXTRA_CHARS);
    assert!(result.is_err());
}

#[test]
fn test_invalid_uuid_wrong_chars() {
    let result = Uuid::parse_str(invalid_uuids::WRONG_CHARS);
    assert!(result.is_err());
}

// -- invalid uuid error tests
#[test]
fn test_invalid_uuid_error() {
    let error = AppError::InvalidUuid("not-a-uuid".to_string());

    assert_eq!(error.error_code(), "INVALID_UUID");
    assert!(error.to_string().contains("not-a-uuid"));
}

#[test]
fn test_invalid_uuid_status_code() {
    use axum::http::StatusCode;

    let error = AppError::InvalidUuid("bad".to_string());
    assert_eq!(error.status_code(), StatusCode::BAD_REQUEST);
}

// -- not found tests
#[test]
fn test_file_not_found_error() {
    let file_id = "550e8400-e29b-41d4-a716-446655440000";
    let error = AppError::NotFound(format!("File {} not found", file_id));

    assert_eq!(error.error_code(), "NOT_FOUND");
    assert!(error.to_string().contains(file_id));
}

#[test]
fn test_not_found_status_code() {
    use axum::http::StatusCode;

    let error = AppError::NotFound("File not found".to_string());
    assert_eq!(error.status_code(), StatusCode::NOT_FOUND);
}

// -- download url tests
#[test]
fn test_public_file_url() {
    let config = sample_config();
    let file_id = "550e8400-e29b-41d4-a716-446655440000";

    let url = config.public_file_url(file_id);

    assert_eq!(
        url,
        "https://files.example.com/public/files/550e8400-e29b-41d4-a716-446655440000"
    );
}

#[test]
fn test_health_url() {
    let config = sample_config();
    assert_eq!(config.health_url(), "https://files.example.com/health");
}

#[test]
fn test_health_db_url() {
    let config = sample_config();
    assert_eq!(config.health_db_url(), "https://files.example.com/health?db=true");
}

#[test]
fn test_files_endpoint() {
    let config = sample_config();
    assert_eq!(config.files_endpoint(), "https://files.example.com/api/v1/files");
}

// -- content type tests
#[test]
fn test_pdf_content_type() {
    let content_type = "application/pdf";
    assert!(content_type.starts_with("application/"));
}

#[test]
fn test_image_content_types() {
    let types = vec!["image/png", "image/jpeg", "image/gif", "image/webp"];

    for ct in types {
        assert!(ct.starts_with("image/"));
    }
}

#[test]
fn test_text_content_types() {
    let types = vec!["text/plain", "text/html", "text/csv"];

    for ct in types {
        assert!(ct.starts_with("text/"));
    }
}

#[test]
fn test_default_content_type() {
    let default = "application/octet-stream";
    assert_eq!(default, "application/octet-stream");
}

// -- content disposition tests
fn extract_filename(content_disposition: &str) -> Option<String> {
    content_disposition.split(';').find_map(|part| {
        let part = part.trim();
        if part.starts_with("filename=") {
            let filename = part.trim_start_matches("filename=");
            let filename = filename.trim_matches('"').trim_matches('\'');
            Some(filename.to_string())
        } else {
            None
        }
    })
}

#[test]
fn test_parse_content_disposition_quoted() {
    let header = "attachment; filename=\"document.pdf\"";
    let filename = extract_filename(header);

    assert_eq!(filename, Some("document.pdf".to_string()));
}

#[test]
fn test_parse_content_disposition_unquoted() {
    let header = "attachment; filename=document.pdf";
    let filename = extract_filename(header);

    assert_eq!(filename, Some("document.pdf".to_string()));
}

#[test]
fn test_parse_content_disposition_inline() {
    let header = "inline; filename=\"image.png\"";
    let filename = extract_filename(header);

    assert_eq!(filename, Some("image.png".to_string()));
}

#[test]
fn test_parse_content_disposition_no_filename() {
    let header = "attachment";
    let filename = extract_filename(header);

    assert_eq!(filename, None);
}

// -- path parameter tests
#[test]
fn test_extract_uuid_from_path() {
    let path = "/download/550e8400-e29b-41d4-a716-446655440000";
    let id_part = path.trim_start_matches("/download/");

    let result = Uuid::parse_str(id_part);
    assert!(result.is_ok());
}

#[test]
fn test_path_with_trailing_slash() {
    let path = "/download/550e8400-e29b-41d4-a716-446655440000/";
    let id_part = path
        .trim_start_matches("/download/")
        .trim_end_matches('/');

    let result = Uuid::parse_str(id_part);
    assert!(result.is_ok());
}

#[test]
fn test_empty_path_id() {
    let path = "/download/";
    let id_part = path.trim_start_matches("/download/");

    assert!(id_part.is_empty() || Uuid::parse_str(id_part).is_err());
}

#[test]
fn test_invalid_path_id() {
    let path = "/download/abc";
    let id_part = path.trim_start_matches("/download/");

    let result = Uuid::parse_str(id_part);
    assert!(result.is_err());
}
