//! Integration tests for POST /upload endpoint
//!
//! Run with: cargo test --test integration_upload_test -- --nocapture
//!
//! REQUIRES:
//! - Service running on http://localhost:8080
//! - Redis running
//! - NATS running

use reqwest::multipart;
use serde_json::Value;

const BASE_URL: &str = "http://localhost:8080";

/// -- Test: Upload a real file and see the response
#[tokio::test]
async fn test_upload_file_real() {
    println!("{}\n", "=".repeat(60));
    println!("TEST: Upload real file to service");
    println!("{}\n", "=".repeat(60));

    let client = reqwest::Client::new();

    // Create test file content
    let file_content = b"This is a test file content for upload testing.\nLine 2 of the file.";

    let file_part = multipart::Part::bytes(file_content.to_vec())
        .file_name("test-document.txt")
        .mime_str("text/plain")
        .unwrap();

    let form = multipart::Form::new()
        .text("project_id", "test-project-001")
        .text("user_id", "test-user-001")
        .text("is_public", "true")
        .part("file", file_part);

    println!("-- Sending upload request to {}/upload", BASE_URL);
    println!("   Project ID: test-project-001");
    println!("   User ID: test-user-001");
    println!("   File: test-document.txt ({} bytes)", file_content.len());
    println!();

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let headers = res.headers().clone();
            let body = res.text().await.unwrap_or_default();

            println!("-- Response received:");
            println!(
                "   Status: {} {}",
                status.as_u16(),
                status.canonical_reason().unwrap_or("")
            );
            println!("   Content-Type: {:?}", headers.get("content-type"));
            println!();
            println!("-- Response Body:");

            // Pretty print JSON
            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            } else {
                println!("{}", body);
            }
            println!();

            if status.is_success() {
                println!("ok UPLOAD SUCCESSFUL!");

                // Extract file_id for later use
                if let Ok(json) = serde_json::from_str::<Value>(&body) {
                    if let Some(file_id) = json["data"]["id"].as_str() {
                        println!("   File ID: {}", file_id);
                        println!("   Download URL: {}/download/{}", BASE_URL, file_id);
                    }
                }
            } else {
                println!("err UPLOAD FAILED!");
            }
        }
        Err(e) => {
            println!("err REQUEST ERROR: {}", e);
            println!();
            println!("-- Make sure the service is running: make run");
        }
    }

    println!("\n{}\n", "=".repeat(60));
}

/// -- Test: Upload without project_id (should fail)
#[tokio::test]
async fn test_upload_missing_project_id() {
    println!("{}\n", "=".repeat(60));
    println!("TEST: Upload without project_id (expect error)");
    println!("{}\n", "=".repeat(60));

    let client = reqwest::Client::new();

    let file_part = multipart::Part::bytes(b"test content".to_vec())
        .file_name("test.txt")
        .mime_str("text/plain")
        .unwrap();

    let form = multipart::Form::new()
        // Missing project_id!
        .text("user_id", "test-user")
        .text("is_public", "true")
        .part("file", file_part);

    println!("-- Sending upload WITHOUT project_id...");

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("-- Response:");
            println!("   Status: {}", status);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            } else {
                println!("{}", body);
            }

            if status.as_u16() == 400 {
                println!("\nok CORRECT! Server rejected request with 400 Bad Request");
            }
        }
        Err(e) => {
            println!("err REQUEST ERROR: {}", e);
        }
    }

    println!("\n{}\n", "=".repeat(60));
}

/// -- Test: Upload without file (should fail)
#[tokio::test]
async fn test_upload_missing_file() {
    println!("{}\n", "=".repeat(60));
    println!("TEST: Upload without file (expect error)");
    println!("{}\n", "=".repeat(60));

    let client = reqwest::Client::new();

    let form = multipart::Form::new()
        .text("project_id", "test-project")
        .text("user_id", "test-user")
        .text("is_public", "true");
    // Missing file!

    println!("-- Sending upload WITHOUT file...");

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("-- Response:");
            println!("   Status: {}", status);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            }

            if status.as_u16() == 400 {
                println!("\nok CORRECT! Server rejected request with 400 Bad Request");
            }
        }
        Err(e) => {
            println!("err REQUEST ERROR: {}", e);
        }
    }

    println!("\n{}\n", "=".repeat(60));
}

/// -- Test: Upload a PDF file
#[tokio::test]
async fn test_upload_pdf_file() {
    println!("{}\n", "=".repeat(60));
    println!("TEST: Upload PDF file");
    println!("{}\n", "=".repeat(60));

    let client = reqwest::Client::new();

    // Minimal valid PDF
    let pdf_content =
        b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF";

    let file_part = multipart::Part::bytes(pdf_content.to_vec())
        .file_name("document.pdf")
        .mime_str("application/pdf")
        .unwrap();

    let form = multipart::Form::new()
        .text("project_id", "pdf-test-project")
        .text("user_id", "pdf-user")
        .text("is_public", "true")
        .part("file", file_part);

    println!("-- Uploading PDF file...");
    println!("   File: document.pdf ({} bytes)", pdf_content.len());

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("\n-- Response (Status: {}):", status);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());

                if status.is_success() {
                    if let Some(mime) = json["data"]["mime_type"].as_str() {
                        println!("\nok PDF uploaded! MIME type: {}", mime);
                    }
                }
            }
        }
        Err(e) => {
            println!("err REQUEST ERROR: {}", e);
        }
    }

    println!("\n{}\n", "=".repeat(60));
}
