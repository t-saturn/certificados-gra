//! Integration tests for GET /download/:id endpoint
//!
//! Run with: cargo test --test integration_download_test -- --nocapture
//!
//! REQUIRES:
//! - Service running on http://localhost:8080

use reqwest::multipart;
use serde_json::Value;

const BASE_URL: &str = "http://localhost:8080";

/// Test: Upload a file and then download it
#[tokio::test]
async fn test_upload_then_download() {
    println!("{}\n", "=".repeat(60));
    println!("TEST: Upload file, then download it");
    println!("{}\n", "=".repeat(60));

    let client = reqwest::Client::new();

    // Step 1: Upload a file
    let file_content = b"Hello, this is test content for download test!";

    let file_part = multipart::Part::bytes(file_content.to_vec())
        .file_name("download-test.txt")
        .mime_str("text/plain")
        .unwrap();

    let form = multipart::Form::new()
        .text("project_id", "download-test-project")
        .text("user_id", "download-test-user")
        .text("is_public", "true")
        .part("file", file_part);

    println!("-- Step 1: Uploading file...");

    let upload_response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    let file_id = match upload_response {
        Ok(res) => {
            let body = res.text().await.unwrap_or_default();

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("-- Upload response:");
                println!("{}", serde_json::to_string_pretty(&json).unwrap());

                json["data"]["id"].as_str().map(|s| s.to_string())
            } else {
                None
            }
        }
        Err(e) => {
            println!("err Upload failed: {}", e);
            return;
        }
    };

    let file_id = match file_id {
        Some(id) => id,
        None => {
            println!("err Could not get file_id from upload response");
            return;
        }
    };

    println!("\n-- Step 2: Downloading file...");
    println!("   File ID: {}", file_id);
    println!("   URL: {}/download/{}", BASE_URL, file_id);

    // Step 2: Download the file
    let download_response = client
        .get(format!("{}/download/{}", BASE_URL, file_id))
        .send()
        .await;

    match download_response {
        Ok(res) => {
            let status = res.status();
            let headers = res.headers().clone();

            println!("\n-- Download Response:");
            println!("   Status: {}", status);
            println!("   Content-Type: {:?}", headers.get("content-type"));
            println!(
                "   Content-Disposition: {:?}",
                headers.get("content-disposition")
            );
            println!("   Content-Length: {:?}", headers.get("content-length"));

            if status.is_success() {
                let body = res.bytes().await.unwrap_or_default();
                println!("\n   Downloaded {} bytes", body.len());

                // Show content if it's text
                if let Ok(text) = String::from_utf8(body.to_vec()) {
                    println!("   Content: \"{}\"", text);
                }

                println!("\nok DOWNLOAD SUCCESSFUL!");
            } else {
                let body = res.text().await.unwrap_or_default();
                println!("\nerr Download failed:");
                if let Ok(json) = serde_json::from_str::<Value>(&body) {
                    println!("{}", serde_json::to_string_pretty(&json).unwrap());
                }
            }
        }
        Err(e) => {
            println!("err REQUEST ERROR: {}", e);
        }
    }

    println!("\n{}\n", "=".repeat(60));
}

/// Test: Download with invalid UUID
#[tokio::test]
async fn test_download_invalid_uuid() {
    println!("{}\n", "=".repeat(60));
    println!("TEST: Download with invalid UUID (expect error)");
    println!("{}\n", "=".repeat(60));

    let client = reqwest::Client::new();
    let invalid_id = "not-a-valid-uuid";

    println!("-- Requesting download with invalid ID: {}", invalid_id);

    let response = client
        .get(format!("{}/download/{}", BASE_URL, invalid_id))
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("\n-- Response:");
            println!("   Status: {}", status);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            }

            if status.as_u16() == 400 {
                println!("\nok CORRECT! Server returned 400 Bad Request for invalid UUID");
            }
        }
        Err(e) => {
            println!("err REQUEST ERROR: {}", e);
        }
    }

    println!("\n{}\n", "=".repeat(60));
}

/// Test: Download non-existent file
#[tokio::test]
async fn test_download_not_found() {
    println!("{}\n", "=".repeat(60));
    println!("TEST: Download non-existent file (expect 404)");
    println!("{}\n", "=".repeat(60));

    let client = reqwest::Client::new();
    let fake_uuid = "00000000-0000-0000-0000-000000000000";

    println!(
        "-- Requesting download for non-existent file: {}",
        fake_uuid
    );

    let response = client
        .get(format!("{}/download/{}", BASE_URL, fake_uuid))
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("\n-- Response:");
            println!("   Status: {}", status);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            }

            if status.as_u16() == 404 || status.as_u16() == 502 {
                println!("\nok CORRECT! Server returned error for non-existent file");
            }
        }
        Err(e) => {
            println!("err REQUEST ERROR: {}", e);
        }
    }

    println!("\n{}\n", "=".repeat(60));
}

/// Test: Health check endpoint
#[tokio::test]
async fn test_health_check() {
    println!("{}\n", "=".repeat(60));
    println!("TEST: Health check endpoint");
    println!("{}\n", "=".repeat(60));

    let client = reqwest::Client::new();

    // Basic health
    println!("-- GET /health");
    let response = client.get(format!("{}/health", BASE_URL)).send().await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("   Status: {}", status);
            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            }
        }
        Err(e) => {
            println!("err ERROR: {}", e);
        }
    }

    // Full health check
    println!("\n-- GET /health?full=true");
    let response = client
        .get(format!("{}/health?full=true", BASE_URL))
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("   Status: {}", status);
            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            }

            if status.is_success() {
                println!("\nok Service is healthy!");
            }
        }
        Err(e) => {
            println!("err ERROR: {}", e);
            println!("\n-- Make sure the service is running: make run");
        }
    }

    println!("\n{}\n", "=".repeat(60));
}
