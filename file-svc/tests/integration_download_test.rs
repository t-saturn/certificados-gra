//! Integration tests for GET /download/:id endpoint
//!
//! Run with: cargo test --test integration_download_test -- --nocapture --test-threads=1
//!
//! REQUIRES: Service running on http://localhost:8080

use reqwest::multipart;
use serde_json::Value;

const BASE_URL: &str = "http://localhost:8080";
const USER_ID: &str = "584211ff-6e2a-4e59-a3bf-6738535ab5e0";
// project_id DEBE ser un UUID válido
const PROJECT_ID: &str = "f13fe72f-d50c-4824-9f8c-b073a7f93aaf";

/// Helper to check if service is running
async fn check_service() -> bool {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .unwrap();

    match client.get(format!("{}/health", BASE_URL)).send().await {
        Ok(res) => res.status().is_success(),
        Err(_) => false,
    }
}

/// Test: Complete flow - Upload a file, then download it
#[tokio::test]
async fn test_01_upload_then_download() {
    println!("\n{}", "=".repeat(70));
    println!("TEST: Complete flow - Upload file, then Download it");
    println!("{}\n", "=".repeat(70));

    if !check_service().await {
        println!("❌ SERVICE NOT RUNNING!");
        println!("   Please start the service first: make run");
        println!("{}\n", "=".repeat(70));
        return;
    }

    let client = reqwest::Client::new();

    // ========== STEP 1: Upload ==========
    println!("📤 STEP 1: UPLOAD");
    println!("{}", "-".repeat(50));

    let file_content = b"Hello! This is test content for the upload-download flow test.\nCreated at: 2025-12-28\nUser: test";

    let file_part = multipart::Part::bytes(file_content.to_vec())
        .file_name("flow-test.txt")
        .mime_str("text/plain")
        .unwrap();

    let form = multipart::Form::new()
        .text("project_id", PROJECT_ID) // UUID válido
        .text("user_id", USER_ID)
        .text("is_public", "true")
        .part("file", file_part);

    println!("   Uploading: flow-test.txt ({} bytes)", file_content.len());
    println!("   project_id: {}", PROJECT_ID);
    println!("   user_id: {}", USER_ID);

    let upload_response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    let file_id = match upload_response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("\n   Response (Status: {}):", status);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());

                if status.is_success() {
                    let id = json["data"]["id"].as_str().map(|s| s.to_string());
                    if let Some(ref file_id) = id {
                        println!("\n   ✅ Upload OK! File ID: {}", file_id);
                    }
                    id
                } else {
                    println!("\n   ❌ Upload failed!");
                    None
                }
            } else {
                println!("   Raw: {}", body);
                None
            }
        }
        Err(e) => {
            println!("   ❌ Upload error: {}", e);
            None
        }
    };

    let file_id = match file_id {
        Some(id) => id,
        None => {
            println!("\n❌ Cannot continue: No file_id from upload");
            println!("{}\n", "=".repeat(70));
            return;
        }
    };

    // ========== STEP 2: Download ==========
    println!("\n📥 STEP 2: DOWNLOAD");
    println!("{}", "-".repeat(50));
    println!("   File ID: {}", file_id);
    println!("   URL: {}/download/{}", BASE_URL, file_id);

    let download_response = client
        .get(format!("{}/download/{}", BASE_URL, file_id))
        .send()
        .await;

    match download_response {
        Ok(res) => {
            let status = res.status();
            let headers = res.headers().clone();

            println!("\n   Response:");
            println!("   Status: {}", status);

            if let Some(ct) = headers.get("content-type") {
                println!("   Content-Type: {:?}", ct);
            }
            if let Some(cd) = headers.get("content-disposition") {
                println!("   Content-Disposition: {:?}", cd);
            }
            if let Some(cl) = headers.get("content-length") {
                println!("   Content-Length: {:?}", cl);
            }

            if status.is_success() {
                let body = res.bytes().await.unwrap_or_default();
                println!("\n   Downloaded: {} bytes", body.len());

                if let Ok(text) = String::from_utf8(body.to_vec()) {
                    println!("   Content preview:");
                    println!("   ┌{}┐", "─".repeat(50));
                    for line in text.lines().take(5) {
                        println!("   │ {}", line);
                    }
                    println!("   └{}┘", "─".repeat(50));
                }

                println!("\n✅ DOWNLOAD SUCCESSFUL!");

                if body.as_ref() == file_content {
                    println!("✅ CONTENT VERIFIED! Downloaded matches uploaded.");
                }
            } else {
                let body = res.text().await.unwrap_or_default();
                println!("\n   ❌ Download failed!");
                if let Ok(json) = serde_json::from_str::<Value>(&body) {
                    println!("{}", serde_json::to_string_pretty(&json).unwrap());
                }
            }
        }
        Err(e) => {
            println!("   ❌ Download error: {}", e);
        }
    }

    println!("\n{}\n", "=".repeat(70));
}

/// Test: Download with invalid UUID (should fail with 400)
#[tokio::test]
async fn test_02_download_invalid_uuid() {
    println!("\n{}", "=".repeat(70));
    println!("TEST: Download with invalid UUID (expect 400)");
    println!("{}\n", "=".repeat(70));

    if !check_service().await {
        println!("❌ SERVICE NOT RUNNING! Skipping...");
        return;
    }

    let client = reqwest::Client::new();
    let invalid_id = "not-a-valid-uuid";

    println!("📥 Requesting: {}/download/{}", BASE_URL, invalid_id);

    let response = client
        .get(format!("{}/download/{}", BASE_URL, invalid_id))
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("\n   Response (Status: {}):", status);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            }

            if status.as_u16() == 400 || status.as_u16() == 404 {
                println!("\n✅ CORRECT! Server returned error for invalid UUID");
            } else {
                println!("\n⚠️ Unexpected status: {}", status);
            }
        }
        Err(e) => println!("❌ Error: {}", e),
    }

    println!("\n{}\n", "=".repeat(70));
}

/// Test: Download non-existent file (should fail with 404 or 502)
#[tokio::test]
async fn test_03_download_not_found() {
    println!("\n{}", "=".repeat(70));
    println!("TEST: Download non-existent file (expect 404/502)");
    println!("{}\n", "=".repeat(70));

    if !check_service().await {
        println!("❌ SERVICE NOT RUNNING! Skipping...");
        return;
    }

    let client = reqwest::Client::new();
    let fake_uuid = "00000000-0000-0000-0000-000000000000";

    println!("📥 Requesting: {}/download/{}", BASE_URL, fake_uuid);

    let response = client
        .get(format!("{}/download/{}", BASE_URL, fake_uuid))
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("\n   Response (Status: {}):", status);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            }

            if status.as_u16() == 404 || status.as_u16() == 502 {
                println!("\n✅ CORRECT! Server returned error for non-existent file");
            } else {
                println!("\n⚠️ Unexpected status: {}", status);
            }
        }
        Err(e) => println!("❌ Error: {}", e),
    }

    println!("\n{}\n", "=".repeat(70));
}

/// Test: Health check endpoint
#[tokio::test]
async fn test_04_health_check() {
    println!("\n{}", "=".repeat(70));
    println!("TEST: Health check endpoints");
    println!("{}\n", "=".repeat(70));

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap();

    println!("📥 GET {}/health", BASE_URL);

    match client.get(format!("{}/health", BASE_URL)).send().await {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("   Status: {}", status);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            }

            if status.is_success() {
                println!("\n✅ Service is healthy!");
            }
        }
        Err(e) => {
            println!("   ❌ Error: {}", e);
            println!("\n   💡 Start the service: make run");
        }
    }

    println!("\n📥 GET {}/health?full=true", BASE_URL);

    match client
        .get(format!("{}/health?full=true", BASE_URL))
        .send()
        .await
    {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("   Status: {}", status);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            }
        }
        Err(e) => {
            println!("   ❌ Error: {}", e);
        }
    }

    println!("\n{}\n", "=".repeat(70));
}
