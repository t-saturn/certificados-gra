//! Tests for download events
//!
//! Events tested:
//! - files.download.requested
//! - files.download.completed
//! - files.download.failed

use uuid::Uuid;

use file_svc::events::payloads::{DownloadCompleted, DownloadFailed, DownloadRequested};
use file_svc::events::Subjects;

// -- subject constants test
#[test]
fn test_download_subjects() {
    assert_eq!(Subjects::DOWNLOAD_REQUESTED, "files.download.requested");
    assert_eq!(Subjects::DOWNLOAD_COMPLETED, "files.download.completed");
    assert_eq!(Subjects::DOWNLOAD_FAILED, "files.download.failed");
}

#[test]
fn test_download_wildcard() {
    assert_eq!(Subjects::DOWNLOAD_ALL, "files.download.*");
}

#[test]
fn test_subject_hierarchy() {
    assert!(Subjects::DOWNLOAD_REQUESTED.starts_with("files.download."));
    assert!(Subjects::DOWNLOAD_COMPLETED.starts_with("files.download."));
    assert!(Subjects::DOWNLOAD_FAILED.starts_with("files.download."));
}

// -- download requested event test
fn sample_download_requested() -> DownloadRequested {
    DownloadRequested {
        job_id: Uuid::new_v4(),
        file_id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap(),
        project_id: "test-project".to_string(),
        user_id: "test-user".to_string(),
    }
}

#[test]
fn test_download_requested_serialization() {
    let event = sample_download_requested();
    let json = serde_json::to_string(&event).unwrap();

    assert!(json.contains("\"job_id\""));
    assert!(json.contains("\"file_id\""));
    assert!(json.contains("\"project_id\":\"test-project\""));
    assert!(json.contains("\"user_id\":\"test-user\""));
}

#[test]
fn test_download_requested_deserialization() {
    let job_id = Uuid::new_v4();
    let file_id = Uuid::new_v4();
    let json = format!(
        r#"{{
            "job_id": "{}",
            "file_id": "{}",
            "project_id": "my-project",
            "user_id": "user-456"
        }}"#,
        job_id, file_id
    );

    let event: DownloadRequested = serde_json::from_str(&json).unwrap();

    assert_eq!(event.job_id, job_id);
    assert_eq!(event.file_id, file_id);
    assert_eq!(event.project_id, "my-project");
    assert_eq!(event.user_id, "user-456");
}

#[test]
fn test_download_requested_missing_field() {
    let json = r#"{
        "job_id": "550e8400-e29b-41d4-a716-446655440000",
        "file_id": "550e8400-e29b-41d4-a716-446655440001",
        "project_id": "test"
    }"#;

    let result: Result<DownloadRequested, _> = serde_json::from_str(json);
    assert!(result.is_err()); // user_id is missing
}

#[test]
fn test_multiple_download_requests() {
    let file_id = Uuid::new_v4();

    let request1 = DownloadRequested {
        job_id: Uuid::new_v4(),
        file_id,
        project_id: "project-1".to_string(),
        user_id: "user-1".to_string(),
    };

    let request2 = DownloadRequested {
        job_id: Uuid::new_v4(),
        file_id,
        project_id: "project-1".to_string(),
        user_id: "user-2".to_string(),
    };

    assert_eq!(request1.file_id, request2.file_id);
    assert_ne!(request1.job_id, request2.job_id);
    assert_ne!(request1.user_id, request2.user_id);
}

// -- download completed event test
fn sample_download_completed() -> DownloadCompleted {
    DownloadCompleted {
        job_id: Uuid::new_v4(),
        file_id: Uuid::new_v4(),
        project_id: "test-project".to_string(),
        user_id: "test-user".to_string(),
        file_name: "downloaded-file.pdf".to_string(),
        file_size: 4096,
        download_url: "https://files.example.com/public/files/abc".to_string(),
    }
}

#[test]
fn test_download_completed_serialization() {
    let event = sample_download_completed();
    let json = serde_json::to_string(&event).unwrap();

    assert!(json.contains("\"file_name\":\"downloaded-file.pdf\""));
    assert!(json.contains("\"file_size\":4096"));
    assert!(json.contains("\"download_url\""));
}

#[test]
fn test_download_completed_deserialization() {
    let job_id = Uuid::new_v4();
    let file_id = Uuid::new_v4();
    let json = format!(
        r#"{{
            "job_id": "{}",
            "file_id": "{}",
            "project_id": "proj",
            "user_id": "usr",
            "file_name": "report.xlsx",
            "file_size": 8192,
            "download_url": "https://cdn.example.com/files/xyz"
        }}"#,
        job_id, file_id
    );

    let event: DownloadCompleted = serde_json::from_str(&json).unwrap();

    assert_eq!(event.job_id, job_id);
    assert_eq!(event.file_id, file_id);
    assert_eq!(event.file_name, "report.xlsx");
    assert_eq!(event.file_size, 8192);
    assert!(event.download_url.contains("cdn.example.com"));
}

#[test]
fn test_download_completed_file_sizes() {
    let sizes: Vec<u64> = vec![
        0,
        100,
        1024,                // 1 KB
        1024 * 1024,         // 1 MB
        100 * 1024 * 1024,   // 100 MB
        1024 * 1024 * 1024,  // 1 GB
    ];

    for size in sizes {
        let event = DownloadCompleted {
            job_id: Uuid::new_v4(),
            file_id: Uuid::new_v4(),
            project_id: "test".to_string(),
            user_id: "test".to_string(),
            file_name: "file.bin".to_string(),
            file_size: size,
            download_url: "https://example.com".to_string(),
        };

        let json = serde_json::to_string(&event).unwrap();
        let parsed: DownloadCompleted = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.file_size, size);
    }
}

// -- download failed event test
fn sample_download_failed() -> DownloadFailed {
    DownloadFailed {
        job_id: Uuid::new_v4(),
        file_id: Uuid::new_v4(),
        project_id: "test-project".to_string(),
        user_id: "test-user".to_string(),
        error_code: "DOWNLOAD_FAILED".to_string(),
        error_message: "File not found on storage".to_string(),
    }
}

#[test]
fn test_download_failed_serialization() {
    let event = sample_download_failed();
    let json = serde_json::to_string(&event).unwrap();

    assert!(json.contains("\"error_code\":\"DOWNLOAD_FAILED\""));
    assert!(json.contains("\"error_message\""));
}

#[test]
fn test_download_failed_deserialization() {
    let job_id = Uuid::new_v4();
    let file_id = Uuid::new_v4();
    let json = format!(
        r#"{{
            "job_id": "{}",
            "file_id": "{}",
            "project_id": "proj",
            "user_id": "usr",
            "error_code": "FILE_NOT_FOUND",
            "error_message": "The requested file does not exist"
        }}"#,
        job_id, file_id
    );

    let event: DownloadFailed = serde_json::from_str(&json).unwrap();

    assert_eq!(event.error_code, "FILE_NOT_FOUND");
    assert!(event.error_message.contains("does not exist"));
}

#[test]
fn test_download_failed_error_codes() {
    let error_scenarios = vec![
        ("FILE_NOT_FOUND", "The requested file does not exist"),
        ("ACCESS_DENIED", "User does not have permission"),
        ("STORAGE_ERROR", "Error reading file from storage"),
        ("TIMEOUT", "Download timed out"),
        ("CORRUPTED_FILE", "File checksum mismatch"),
        ("RATE_LIMITED", "Too many download requests"),
    ];

    for (code, message) in error_scenarios {
        let event = DownloadFailed {
            job_id: Uuid::new_v4(),
            file_id: Uuid::new_v4(),
            project_id: "test".to_string(),
            user_id: "test".to_string(),
            error_code: code.to_string(),
            error_message: message.to_string(),
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains(code));

        let parsed: DownloadFailed = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.error_code, code);
    }
}

#[test]
fn test_download_failed_preserves_file_id() {
    let file_id = Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap();

    let event = DownloadFailed {
        job_id: Uuid::new_v4(),
        file_id,
        project_id: "test".to_string(),
        user_id: "test".to_string(),
        error_code: "ERROR".to_string(),
        error_message: "Test error".to_string(),
    };

    let json = serde_json::to_string(&event).unwrap();
    assert!(json.contains("550e8400-e29b-41d4-a716-446655440000"));
}

// -- event flow test
#[test]
fn test_download_success_flow() {
    let job_id = Uuid::new_v4();
    let file_id = Uuid::new_v4();

    let requested = DownloadRequested {
        job_id,
        file_id,
        project_id: "proj".to_string(),
        user_id: "user".to_string(),
    };

    let completed = DownloadCompleted {
        job_id,
        file_id,
        project_id: "proj".to_string(),
        user_id: "user".to_string(),
        file_name: "file.pdf".to_string(),
        file_size: 1024,
        download_url: "https://example.com/file".to_string(),
    };

    assert_eq!(requested.job_id, completed.job_id);
    assert_eq!(requested.file_id, completed.file_id);
    assert_eq!(requested.project_id, completed.project_id);
    assert_eq!(requested.user_id, completed.user_id);
}

#[test]
fn test_download_failure_flow() {
    let job_id = Uuid::new_v4();
    let file_id = Uuid::new_v4();

    let requested = DownloadRequested {
        job_id,
        file_id,
        project_id: "proj".to_string(),
        user_id: "user".to_string(),
    };

    let failed = DownloadFailed {
        job_id,
        file_id,
        project_id: "proj".to_string(),
        user_id: "user".to_string(),
        error_code: "FILE_NOT_FOUND".to_string(),
        error_message: "File was deleted".to_string(),
    };

    assert_eq!(requested.job_id, failed.job_id);
    assert_eq!(requested.file_id, failed.file_id);
}
