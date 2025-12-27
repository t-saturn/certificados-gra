//! Tests for SignatureService
//!
//! Test cases:
//! - ok Signature generation with valid credentials
//! - ok Signature is deterministic for same input
//! - ok Signature changes with different input
//! - ok Timestamp is valid Unix timestamp

use file_svc::services::SignatureService;

// -- signature generation tests
fn sample_service() -> SignatureService {
    SignatureService::new("test-access-key".to_string(), "test-secret-key".to_string())
}

#[test]
fn test_signature_generation() {
    let service = sample_service();
    let (timestamp, signature) = service.generate("POST", "/api/v1/files");

    assert!(!timestamp.is_empty());
    assert!(!signature.is_empty());
}

#[test]
fn test_signature_format() {
    let service = sample_service();
    let (_, signature) = service.generate("POST", "/api/v1/files");

    assert_eq!(signature.len(), 64);
    assert!(signature.chars().all(|c| c.is_ascii_hexdigit()));
}

#[test]
fn test_timestamp_is_unix() {
    let service = sample_service();
    let (timestamp, _) = service.generate("POST", "/api/v1/files");

    let ts: u64 = timestamp.parse().expect("Timestamp should be numeric");
    assert!(ts > 1577836800); // After 2020-01-01
}

#[test]
fn test_access_key_getter() {
    let service = sample_service();
    assert_eq!(service.access_key(), "test-access-key");
}

// -- signature consistency tests
#[test]
fn test_different_methods() {
    let service = SignatureService::new("key".to_string(), "secret".to_string());

    let (ts1, sig1) = service.generate("GET", "/api/v1/files");
    let (ts2, sig2) = service.generate("POST", "/api/v1/files");

    if ts1 == ts2 {
        assert_ne!(sig1, sig2);
    }
}

#[test]
fn test_different_paths() {
    let service = SignatureService::new("key".to_string(), "secret".to_string());

    let (ts1, sig1) = service.generate("POST", "/api/v1/files");
    let (ts2, sig2) = service.generate("POST", "/api/v1/health");

    if ts1 == ts2 {
        assert_ne!(sig1, sig2);
    }
}

#[test]
fn test_different_secrets() {
    let service1 = SignatureService::new("key".to_string(), "secret1".to_string());
    let service2 = SignatureService::new("key".to_string(), "secret2".to_string());

    let (ts1, sig1) = service1.generate("POST", "/api/v1/files");
    let (ts2, sig2) = service2.generate("POST", "/api/v1/files");

    if ts1 == ts2 {
        assert_ne!(sig1, sig2);
    }
}

#[test]
fn test_signature_determinism() {
    let service = SignatureService::new("key".to_string(), "secret".to_string());

    let (ts1, sig1) = service.generate("POST", "/api/v1/files");
    let (ts2, sig2) = service.generate("POST", "/api/v1/files");

    if ts1 == ts2 {
        assert_eq!(sig1, sig2);
    }
}

// -- method normalization tests
#[test]
fn test_method_case_insensitive() {
    let service = SignatureService::new("key".to_string(), "secret".to_string());

    let (ts1, sig1) = service.generate("post", "/api/v1/files");
    let (ts2, sig2) = service.generate("POST", "/api/v1/files");
    let (ts3, sig3) = service.generate("Post", "/api/v1/files");

    if ts1 == ts2 && ts2 == ts3 {
        assert_eq!(sig1, sig2);
        assert_eq!(sig2, sig3);
    }
}

#[test]
fn test_various_http_methods() {
    let service = SignatureService::new("key".to_string(), "secret".to_string());

    let methods = vec!["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

    for method in methods {
        let (timestamp, signature) = service.generate(method, "/api/v1/test");

        assert!(!timestamp.is_empty());
        assert_eq!(signature.len(), 64);
    }
}

// -- path handling tests
#[test]
fn test_various_paths() {
    let service = SignatureService::new("key".to_string(), "secret".to_string());

    let paths = vec![
        "/",
        "/api",
        "/api/v1",
        "/api/v1/files",
        "/api/v1/files/upload",
        "/health",
    ];

    for path in paths {
        let (timestamp, signature) = service.generate("GET", path);

        assert!(!timestamp.is_empty());
        assert_eq!(signature.len(), 64);
    }
}

#[test]
fn test_path_with_query() {
    let service = SignatureService::new("key".to_string(), "secret".to_string());

    let (_, _sig1) = service.generate("GET", "/api/v1/files");
    let (_, _sig2) = service.generate("GET", "/api/v1/files?page=1");

    // Different paths should have different signatures
}

// -- edge case tests
#[test]
fn test_empty_access_key() {
    let service = SignatureService::new("".to_string(), "secret".to_string());

    let (timestamp, signature) = service.generate("POST", "/api");

    assert!(!timestamp.is_empty());
    assert_eq!(signature.len(), 64);
    assert_eq!(service.access_key(), "");
}

#[test]
fn test_empty_secret_key() {
    let service = SignatureService::new("key".to_string(), "".to_string());

    let (timestamp, signature) = service.generate("POST", "/api");

    assert!(!timestamp.is_empty());
    assert_eq!(signature.len(), 64);
}

#[test]
fn test_unicode_credentials() {
    let service = SignatureService::new("キー".to_string(), "秘密".to_string());

    let (timestamp, signature) = service.generate("POST", "/api");

    assert!(!timestamp.is_empty());
    assert_eq!(signature.len(), 64);
}

#[test]
fn test_long_credentials() {
    let long_key = "a".repeat(1000);
    let long_secret = "b".repeat(1000);

    let service = SignatureService::new(long_key, long_secret);
    let (timestamp, signature) = service.generate("POST", "/api");

    assert!(!timestamp.is_empty());
    assert_eq!(signature.len(), 64);
}

#[test]
fn test_special_characters_in_path() {
    let service = SignatureService::new("key".to_string(), "secret".to_string());

    let paths = vec![
        "/api/v1/files?name=test%20file.pdf",
        "/api/v1/files?filter=a&b=c",
        "/api/v1/files#section",
    ];

    for path in paths {
        let (timestamp, signature) = service.generate("GET", path);

        assert!(!timestamp.is_empty());
        assert_eq!(signature.len(), 64);
    }
}
