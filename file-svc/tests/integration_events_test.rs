//! Integration tests for NATS events
//!
//! Run with: cargo test --test integration_events_test -- --nocapture --test-threads=1
//!
//! REQUIRES:
//! - NATS running on nats://localhost:4222
//! - Service running on http://localhost:8080

use futures_util::StreamExt;
use serde_json::Value;
use std::time::Duration;
use tokio::time::timeout;

const NATS_URL: &str = "nats://localhost:4222";
const BASE_URL: &str = "http://localhost:8080";
const USER_ID: &str = "584211ff-6e2a-4e59-a3bf-6738535ab5e0";

/// Test: Upload file and capture NATS events
#[tokio::test]
async fn test_01_upload_with_events() {
    println!("\n{}", "=".repeat(70));
    println!("TEST: Upload file and capture NATS events");
    println!("{}\n", "=".repeat(70));

    // Connect to NATS
    println!("🔌 Connecting to NATS at {}...", NATS_URL);

    let nats_client = match async_nats::connect(NATS_URL).await {
        Ok(c) => {
            println!("   ✅ Connected to NATS!");
            c
        }
        Err(e) => {
            println!("   ❌ NATS connection failed: {}", e);
            println!("\n   💡 Start NATS:");
            println!("      docker run -d --name filesvc_nats -p 4222:4222 nats:2.10-alpine");
            return;
        }
    };

    // Subscribe to upload events BEFORE uploading
    let mut subscriber = match nats_client.subscribe("files.upload.>".to_string()).await {
        Ok(s) => {
            println!("   📡 Subscribed to: files.upload.>");
            s
        }
        Err(e) => {
            println!("   ❌ Subscribe failed: {}", e);
            return;
        }
    };

    // Check HTTP service
    let http_client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap();

    println!("\n🔌 Checking service at {}...", BASE_URL);

    match http_client.get(format!("{}/health", BASE_URL)).send().await {
        Ok(res) if res.status().is_success() => {
            println!("   ✅ Service is running!");
        }
        _ => {
            println!("   ❌ Service not available!");
            println!("\n   💡 Start the service: make run");
            return;
        }
    }

    // Upload file
    println!("\n📤 Uploading file...");

    let file_content = b"Event test file content - timestamp: 2025-12-28";

    let file_part = reqwest::multipart::Part::bytes(file_content.to_vec())
        .file_name("event-test.txt")
        .mime_str("text/plain")
        .unwrap();

    let form = reqwest::multipart::Form::new()
        .text("project_id", "f13fe72f-d50c-4824-9f8c-b073a7f93aaf")
        .text("user_id", USER_ID)
        .text("is_public", "true")
        .part("file", file_part);

    // Send upload in background
    let upload_handle = tokio::spawn(async move {
        match http_client
            .post(format!("{}/upload", BASE_URL))
            .multipart(form)
            .send()
            .await
        {
            Ok(res) => {
                let status = res.status();
                let body = res.text().await.unwrap_or_default();

                println!("\n   📥 Upload Response (Status: {}):", status);
                if let Ok(json) = serde_json::from_str::<Value>(&body) {
                    println!("{}", serde_json::to_string_pretty(&json).unwrap());
                }
                status.is_success()
            }
            Err(e) => {
                println!("\n   ❌ Upload error: {}", e);
                false
            }
        }
    });

    // Listen for events (max 15 seconds)
    println!("\n📡 Listening for NATS events (15 seconds max)...");
    println!("{}", "-".repeat(60));

    let mut events_received = Vec::new();

    let _ = timeout(Duration::from_secs(15), async {
        while let Some(message) = subscriber.next().await {
            let subject = message.subject.to_string();

            println!("\n🔔 EVENT RECEIVED!");
            println!("   Subject: {}", subject);

            if let Ok(json) = serde_json::from_slice::<Value>(&message.payload) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
                events_received.push((subject.clone(), json));
            }

            println!("{}", "-".repeat(60));

            // Stop after completed or failed
            if subject.contains("completed") || subject.contains("failed") {
                break;
            }
        }
    })
    .await;

    // Wait for upload to finish
    let upload_success = upload_handle.await.unwrap_or(false);

    // Summary
    println!("\n📊 SUMMARY:");
    println!(
        "   Upload successful: {}",
        if upload_success { "✅ Yes" } else { "❌ No" }
    );
    println!("   Events captured: {}", events_received.len());

    for (i, (subject, _)) in events_received.iter().enumerate() {
        println!("   {}. {}", i + 1, subject);
    }

    if events_received.is_empty() {
        println!("\n⚠️ No events captured!");
        println!("   Check if service is publishing to NATS correctly.");
    } else {
        println!("\n✅ Events working correctly!");
    }

    println!("\n{}\n", "=".repeat(70));
}

/// Test: Subscribe and display event subjects info
#[tokio::test]
async fn test_02_list_event_subjects() {
    println!("\n{}", "=".repeat(70));
    println!("INFO: NATS Event Subjects for file-svc");
    println!("{}\n", "=".repeat(70));

    println!("📋 Upload Events:");
    println!("   files.upload.requested  → When upload starts");
    println!("   files.upload.completed  → When upload succeeds (includes file_id)");
    println!("   files.upload.failed     → When upload fails (includes error)");
    println!();
    println!("📋 Download Events:");
    println!("   files.download.requested  → When download starts");
    println!("   files.download.completed  → When download succeeds");
    println!("   files.download.failed     → When download fails");
    println!();
    println!("📋 Wildcards:");
    println!("   files.upload.*   → All upload events");
    println!("   files.download.* → All download events");
    println!("   files.>          → ALL file events");
    println!();
    println!("💡 Monitor events with NATS CLI:");
    println!("   nats sub 'files.>'");
    println!();
    println!("💡 Or run this test:");
    println!("   cargo test test_01_upload_with_events -- --nocapture");

    println!("\n{}\n", "=".repeat(70));
}

/// Test: NATS connectivity
#[tokio::test]
async fn test_03_nats_connectivity() {
    println!("\n{}", "=".repeat(70));
    println!("TEST: NATS Connectivity");
    println!("{}\n", "=".repeat(70));

    println!("🔌 Connecting to NATS at {}...", NATS_URL);

    match async_nats::connect(NATS_URL).await {
        Ok(client) => {
            println!("   ✅ Connected!");

            // Test publish/subscribe
            let subject = "test.ping";
            let mut sub = client.subscribe(subject.to_string()).await.unwrap();

            let test_msg = format!("ping-{}", chrono::Utc::now().timestamp());
            client
                .publish(subject.to_string(), test_msg.clone().into())
                .await
                .unwrap();

            match timeout(Duration::from_secs(2), sub.next()).await {
                Ok(Some(msg)) => {
                    let received = String::from_utf8_lossy(&msg.payload);
                    if received == test_msg {
                        println!("   ✅ Publish/Subscribe working!");
                        println!("\n✅ NATS is fully operational!");
                    }
                }
                _ => {
                    println!("   ⚠️ Message not received");
                }
            }
        }
        Err(e) => {
            println!("   ❌ Connection failed: {}", e);
            println!("\n   💡 Start NATS:");
            println!("      docker run -d --name filesvc_nats -p 4222:4222 nats:2.10-alpine");
        }
    }

    println!("\n{}\n", "=".repeat(70));
}
