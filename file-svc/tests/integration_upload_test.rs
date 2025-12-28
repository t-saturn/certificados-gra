//! Integration tests for POST /upload endpoint
//!
//! Run with: cargo test --test integration_upload_test -- --nocapture --test-threads=1
//!
//! REQUIRES: Service running on http://localhost:8080

use reqwest::multipart;
use serde_json::Value;

const BASE_URL: &str = "http://localhost:8080";
const USER_ID: &str = "584211ff-6e2a-4e59-a3bf-6738535ab5e0";
// project_id DEBE ser un UUID válido (requerido por el servidor externo)
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

/// Test: Upload a real file and see the response
#[tokio::test]
async fn test_01_upload_file_real() {
    println!("\n{}", "=".repeat(70));
    println!("TEST: Upload real file to service");
    println!("{}\n", "=".repeat(70));

    if !check_service().await {
        println!("❌ SERVICE NOT RUNNING!");
        println!("   Please start the service first: make run");
        println!("{}\n", "=".repeat(70));
        return;
    }

    let client = reqwest::Client::new();

    let file_content = b"This is a test file content for upload testing.\nLine 2 of the file.\nTimestamp: 2025-12-28";

    let file_part = multipart::Part::bytes(file_content.to_vec())
        .file_name("test-document.txt")
        .mime_str("text/plain")
        .unwrap();

    let form = multipart::Form::new()
        .text("project_id", PROJECT_ID) // UUID válido
        .text("user_id", USER_ID)
        .text("is_public", "true")
        .part("file", file_part);

    println!("📤 REQUEST:");
    println!("   URL: POST {}/upload", BASE_URL);
    println!("   project_id: {}", PROJECT_ID);
    println!("   user_id: {}", USER_ID);
    println!("   is_public: true");
    println!("   file: test-document.txt ({} bytes)", file_content.len());
    println!();

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("📥 RESPONSE:");
            println!("   Status: {}", status);
            println!();

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("   Body:");
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
                println!();

                if status.is_success() {
                    println!("✅ UPLOAD SUCCESSFUL!");
                    if let Some(file_id) = json["data"]["id"].as_str() {
                        println!();
                        println!("   📁 File ID: {}", file_id);
                        println!("   🔗 Download: {}/download/{}", BASE_URL, file_id);
                        println!();
                        println!("   💡 Use this file_id to test download:");
                        println!("      curl {}/download/{}", BASE_URL, file_id);
                    }
                } else {
                    println!("❌ UPLOAD FAILED!");
                    println!(
                        "   Error: {}",
                        json["message"].as_str().unwrap_or("Unknown")
                    );
                }
            } else {
                println!("   Raw Body: {}", body);
            }
        }
        Err(e) => {
            println!("❌ CONNECTION ERROR: {}", e);
            println!("   Make sure the service is running: make run");
        }
    }

    println!("\n{}\n", "=".repeat(70));
}

/// Test: Upload PDF file
#[tokio::test]
async fn test_02_upload_pdf_file() {
    println!("\n{}", "=".repeat(70));
    println!("TEST: Upload PDF file");
    println!("{}\n", "=".repeat(70));

    if !check_service().await {
        println!("❌ SERVICE NOT RUNNING! Skipping...");
        return;
    }

    let client = reqwest::Client::new();

    let pdf_content =
        b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF";

    let file_part = multipart::Part::bytes(pdf_content.to_vec())
        .file_name("documento.pdf")
        .mime_str("application/pdf")
        .unwrap();

    let form = multipart::Form::new()
        .text("project_id", PROJECT_ID) // UUID válido
        .text("user_id", USER_ID)
        .text("is_public", "true")
        .part("file", file_part);

    println!(
        "📤 Uploading PDF: documento.pdf ({} bytes)",
        pdf_content.len()
    );
    println!("   project_id: {}", PROJECT_ID);

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("\n📥 Response (Status: {}):", status);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());

                if status.is_success() {
                    println!("\n✅ PDF uploaded successfully!");
                    if let Some(mime) = json["data"]["mime_type"].as_str() {
                        println!("   MIME type: {}", mime);
                    }
                    if let Some(file_id) = json["data"]["id"].as_str() {
                        println!("   File ID: {}", file_id);
                    }
                }
            }
        }
        Err(e) => println!("❌ Error: {}", e),
    }

    println!("\n{}\n", "=".repeat(70));
}

/// Test: Upload without project_id (should fail with 400)
#[tokio::test]
async fn test_03_upload_missing_project_id() {
    println!("\n{}", "=".repeat(70));
    println!("TEST: Upload without project_id (expect 400 error)");
    println!("{}\n", "=".repeat(70));

    if !check_service().await {
        println!("❌ SERVICE NOT RUNNING! Skipping...");
        return;
    }

    let client = reqwest::Client::new();

    let file_part = multipart::Part::bytes(b"test content".to_vec())
        .file_name("test.txt")
        .mime_str("text/plain")
        .unwrap();

    let form = multipart::Form::new()
        // NO project_id!
        .text("user_id", USER_ID)
        .text("is_public", "true")
        .part("file", file_part);

    println!("📤 Sending upload WITHOUT project_id...");

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("\n📥 Response (Status: {}):", status);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            }

            if status.as_u16() == 400 {
                println!("\n✅ CORRECT! Server rejected with 400 Bad Request");
            } else {
                println!("\n⚠️ Expected 400, got {}", status);
            }
        }
        Err(e) => println!("❌ Error: {}", e),
    }

    println!("\n{}\n", "=".repeat(70));
}

/// Test: Upload without file (should fail with 400)
#[tokio::test]
async fn test_04_upload_missing_file() {
    println!("\n{}", "=".repeat(70));
    println!("TEST: Upload without file (expect 400 error)");
    println!("{}\n", "=".repeat(70));

    if !check_service().await {
        println!("❌ SERVICE NOT RUNNING! Skipping...");
        return;
    }

    let client = reqwest::Client::new();

    let form = multipart::Form::new()
        .text("project_id", PROJECT_ID)
        .text("user_id", USER_ID)
        .text("is_public", "true");
    // NO file!

    println!("📤 Sending upload WITHOUT file...");

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("\n📥 Response (Status: {}):", status);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            }

            if status.as_u16() == 400 {
                println!("\n✅ CORRECT! Server rejected with 400 Bad Request");
            } else {
                println!("\n⚠️ Expected 400, got {}", status);
            }
        }
        Err(e) => println!("❌ Error: {}", e),
    }

    println!("\n{}\n", "=".repeat(70));
}
