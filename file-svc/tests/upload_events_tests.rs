//! Tests for upload events
//!
//! Events tested:
//! - files.upload.requested
//! - files.upload.completed
//! - files.upload.failed

use uuid::Uuid;

use file_svc::events::payloads::{EventEnvelope, UploadCompleted, UploadFailed, UploadRequested};
use file_svc::events::Subjects;

// -- subject constants tests
#[test]
fn test_upload_subjects() {
    assert_eq!(Subjects::UPLOAD_REQUESTED, "files.upload.requested");
    assert_eq!(Subjects::UPLOAD_COMPLETED, "files.upload.completed");
    assert_eq!(Subjects::UPLOAD_FAILED, "files.upload.failed");
}

#[test]
fn test_wildcard_subjects() {
    assert_eq!(Subjects::UPLOAD_ALL, "files.upload.*");
    assert_eq!(Subjects::ALL, "files.>");
}

#[test]
fn test_subject_hierarchy() {
    assert!(Subjects::UPLOAD_REQUESTED.starts_with("files.upload."));
    assert!(Subjects::UPLOAD_COMPLETED.starts_with("files.upload."));
    assert!(Subjects::UPLOAD_FAILED.starts_with("files.upload."));
}

// -- upload requested event tests
fn sample_upload_requested() -> UploadRequested {
    UploadRequested {
        job_id: Uuid::new_v4(),
        project_id: "test-project".to_string(),
        user_id: "test-user".to_string(),
        file_name: "document.pdf".to_string(),
        file_size: 1024,
        mime_type: "application/pdf".to_string(),
        is_public: true,
    }
}

#[test]
fn test_upload_requested_serialization() {
    let event = sample_upload_requested();
    let json = serde_json::to_string(&event).unwrap();

    assert!(json.contains("\"project_id\":\"test-project\""));
    assert!(json.contains("\"user_id\":\"test-user\""));
    assert!(json.contains("\"file_name\":\"document.pdf\""));
    assert!(json.contains("\"file_size\":1024"));
    assert!(json.contains("\"mime_type\":\"application/pdf\""));
    assert!(json.contains("\"is_public\":true"));
}

#[test]
fn test_upload_requested_deserialization() {
    let job_id = Uuid::new_v4();
    let json = format!(
        r#"{{
            "job_id": "{}",
            "project_id": "my-project",
            "user_id": "user-123",
            "file_name": "test.txt",
            "file_size": 500,
            "mime_type": "text/plain",
            "is_public": false
        }}"#,
        job_id
    );

    let event: UploadRequested = serde_json::from_str(&json).unwrap();

    assert_eq!(event.job_id, job_id);
    assert_eq!(event.project_id, "my-project");
    assert_eq!(event.user_id, "user-123");
    assert_eq!(event.file_name, "test.txt");
    assert_eq!(event.file_size, 500);
    assert_eq!(event.mime_type, "text/plain");
    assert!(!event.is_public);
}

#[test]
fn test_upload_requested_large_file() {
    let event = UploadRequested {
        job_id: Uuid::new_v4(),
        project_id: "test".to_string(),
        user_id: "test".to_string(),
        file_name: "large-file.zip".to_string(),
        file_size: 100 * 1024 * 1024, // 100 MB
        mime_type: "application/zip".to_string(),
        is_public: false,
    };

    let json = serde_json::to_string(&event).unwrap();
    let parsed: UploadRequested = serde_json::from_str(&json).unwrap();

    assert_eq!(parsed.file_size, 100 * 1024 * 1024);
}

// -- upload completed event tests
fn sample_upload_completed() -> UploadCompleted {
    UploadCompleted {
        job_id: Uuid::new_v4(),
        file_id: Uuid::new_v4(),
        project_id: "test-project".to_string(),
        user_id: "test-user".to_string(),
        file_name: "document.pdf".to_string(),
        file_size: 2048,
        mime_type: "application/pdf".to_string(),
        is_public: true,
        download_url: "https://files.example.com/public/files/abc123".to_string(),
    }
}

#[test]
fn test_upload_completed_serialization() {
    let event = sample_upload_completed();
    let json = serde_json::to_string(&event).unwrap();

    assert!(json.contains("\"file_id\""));
    assert!(json.contains("\"download_url\""));
    assert!(json.contains("https://files.example.com"));
}

#[test]
fn test_upload_completed_fields() {
    let event = sample_upload_completed();

    assert!(!event.job_id.is_nil());
    assert!(!event.file_id.is_nil());
    assert!(!event.project_id.is_empty());
    assert!(!event.user_id.is_empty());
    assert!(!event.file_name.is_empty());
    assert!(event.file_size > 0);
    assert!(!event.mime_type.is_empty());
    assert!(!event.download_url.is_empty());
}

#[test]
fn test_upload_completed_deserialization() {
    let job_id = Uuid::new_v4();
    let file_id = Uuid::new_v4();
    let json = format!(
        r#"{{
            "job_id": "{}",
            "file_id": "{}",
            "project_id": "proj",
            "user_id": "usr",
            "file_name": "file.pdf",
            "file_size": 1000,
            "mime_type": "application/pdf",
            "is_public": true,
            "download_url": "https://example.com/file"
        }}"#,
        job_id, file_id
    );

    let event: UploadCompleted = serde_json::from_str(&json).unwrap();

    assert_eq!(event.job_id, job_id);
    assert_eq!(event.file_id, file_id);
    assert_eq!(event.download_url, "https://example.com/file");
}

// -- upload failed event tests
fn sample_upload_failed() -> UploadFailed {
    UploadFailed {
        job_id: Uuid::new_v4(),
        project_id: "test-project".to_string(),
        user_id: "test-user".to_string(),
        file_name: "failed-file.pdf".to_string(),
        error_code: "UPLOAD_FAILED".to_string(),
        error_message: "Connection timeout".to_string(),
    }
}

#[test]
fn test_upload_failed_serialization() {
    let event = sample_upload_failed();
    let json = serde_json::to_string(&event).unwrap();

    assert!(json.contains("\"error_code\":\"UPLOAD_FAILED\""));
    assert!(json.contains("\"error_message\":\"Connection timeout\""));
}

#[test]
fn test_upload_failed_deserialization() {
    let job_id = Uuid::new_v4();
    let json = format!(
        r#"{{
            "job_id": "{}",
            "project_id": "proj",
            "user_id": "usr",
            "file_name": "bad.txt",
            "error_code": "FILE_TOO_LARGE",
            "error_message": "File exceeds maximum size"
        }}"#,
        job_id
    );

    let event: UploadFailed = serde_json::from_str(&json).unwrap();

    assert_eq!(event.error_code, "FILE_TOO_LARGE");
    assert!(event.error_message.contains("exceeds"));
}

#[test]
fn test_upload_failed_error_codes() {
    let error_codes = vec![
        "UPLOAD_FAILED",
        "FILE_TOO_LARGE",
        "INVALID_FILE_TYPE",
        "STORAGE_ERROR",
        "TIMEOUT",
        "UNAUTHORIZED",
    ];

    for code in error_codes {
        let event = UploadFailed {
            job_id: Uuid::new_v4(),
            project_id: "test".to_string(),
            user_id: "test".to_string(),
            file_name: "test.txt".to_string(),
            error_code: code.to_string(),
            error_message: "Test error".to_string(),
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains(code));
    }
}

// -- event envelope tests
#[test]
fn test_event_envelope_creation() {
    let payload = sample_upload_requested();
    let envelope = EventEnvelope::new(Subjects::UPLOAD_REQUESTED, payload);

    assert!(!envelope.event_id.is_empty());
    assert_eq!(envelope.event_type, Subjects::UPLOAD_REQUESTED);
    assert_eq!(envelope.source, "file-svc");
    assert!(!envelope.timestamp.is_empty());
}

#[test]
fn test_event_envelope_serialization() {
    let payload = serde_json::json!({ "test": "data" });
    let envelope = EventEnvelope::new("test.event", payload);
    let json = serde_json::to_string(&envelope).unwrap();

    assert!(json.contains("\"event_id\""));
    assert!(json.contains("\"event_type\":\"test.event\""));
    assert!(json.contains("\"source\":\"file-svc\""));
    assert!(json.contains("\"timestamp\""));
    assert!(json.contains("\"payload\""));
}

#[test]
fn test_event_envelope_unique_ids() {
    let payload1 = serde_json::json!({"a": 1});
    let payload2 = serde_json::json!({"b": 2});

    let envelope1 = EventEnvelope::new("test", payload1);
    let envelope2 = EventEnvelope::new("test", payload2);

    assert_ne!(envelope1.event_id, envelope2.event_id);
}

#[test]
fn test_event_envelope_timestamp_format() {
    let payload = serde_json::json!({});
    let envelope = EventEnvelope::new("test", payload);

    let parsed = chrono::DateTime::parse_from_rfc3339(&envelope.timestamp);
    assert!(parsed.is_ok());
}
