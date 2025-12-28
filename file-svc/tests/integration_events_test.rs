//! Integration tests for NATS events
//!
//! Run with: cargo test --test integration_events_test -- --nocapture
//!
//! REQUIRES:
//! - NATS running on nats://localhost:4222
//! - Service running (to see events when uploading)

use futures_util::StreamExt;
use serde_json::Value;
use std::time::Duration;
use tokio::time::timeout;

const NATS_URL: &str = "nats://localhost:4222";
const BASE_URL: &str = "http://localhost:8080";

/// -- Test: Subscribe to all file events and display them
#[tokio::test]
async fn test_subscribe_to_events() {
    println!("{}\n", "=".repeat(60));
    println!("TEST: Subscribe to NATS events");
    println!("{}\n", "=".repeat(60));

    println!("🔌 Connecting to NATS at {}...", NATS_URL);

    let client = match async_nats::connect(NATS_URL).await {
        Ok(c) => {
            println!("ok Connected to NATS!\n");
            c
        }
        Err(e) => {
            println!("err Failed to connect to NATS: {}", e);
            println!("\n Make sure NATS is running:");
            println!("   docker run -d --name filesvc_nats -p 4222:4222 nats:2.10-alpine");
            return;
        }
    };

    // Subscribe to all file events
    let subject = "files.>";
    println!("-- Subscribing to: {}", subject);

    let mut subscriber = match client.subscribe(subject.to_string()).await {
        Ok(s) => s,
        Err(e) => {
            println!("err Failed to subscribe: {}", e);
            return;
        }
    };

    println!("ok Subscribed! Waiting for events...");
    println!();
    println!("-- To generate events, upload a file in another terminal:");
    println!("   curl -X POST http://localhost:8080/upload \\");
    println!("     -F 'project_id=test' \\");
    println!("     -F 'user_id=test' \\");
    println!("     -F 'file=@/path/to/file.txt'");
    println!();
    println!("-- Listening for 30 seconds...\n");
    println!("{}", "-".repeat(60));

    let listen_duration = Duration::from_secs(30);
    let mut event_count = 0;

    let _result = timeout(listen_duration, async {
        while let Some(message) = subscriber.next().await {
            event_count += 1;
            let subject = message.subject.to_string();

            println!("\n-- EVENT #{} RECEIVED", event_count);
            println!("   Subject: {}", subject);
            println!("   Size: {} bytes", message.payload.len());

            if let Ok(json) = serde_json::from_slice::<Value>(&message.payload) {
                println!("   Payload:");
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            } else {
                println!("   Raw: {:?}", String::from_utf8_lossy(&message.payload));
            }

            println!("{}", "-".repeat(60));
        }
    })
    .await;

    println!("\n⏱  Timeout reached after 30 seconds");
    println!("-- Total events received: {}", event_count);
    println!("\n{}\n", "=".repeat(60));
}

/// -- Test: Publish a test event and verify it's received
#[tokio::test]
async fn test_publish_and_receive_event() {
    println!("{}\n", "=".repeat(60));
    println!("TEST: Publish and receive NATS event");
    println!("{}\n", "=".repeat(60));

    println!("🔌 Connecting to NATS...");

    let client = match async_nats::connect(NATS_URL).await {
        Ok(c) => {
            println!("ok Connected!\n");
            c
        }
        Err(e) => {
            println!("err Failed to connect: {}", e);
            return;
        }
    };

    // Subscribe first
    let subject = "files.test.event";
    let mut subscriber = client.subscribe(subject.to_string()).await.unwrap();

    // Publish event
    let test_event = serde_json::json!({
        "event_id": uuid::Uuid::new_v4().to_string(),
        "event_type": "files.test.event",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "source": "integration-test",
        "payload": {
            "message": "Hello from integration test!",
            "test_number": 42
        }
    });

    println!("-- Publishing test event to: {}", subject);
    println!("{}", serde_json::to_string_pretty(&test_event).unwrap());

    let payload = serde_json::to_vec(&test_event).unwrap();
    client
        .publish(subject.to_string(), payload.into())
        .await
        .unwrap();

    println!("\n-- Waiting to receive event...");

    // Wait for the event
    match timeout(Duration::from_secs(5), subscriber.next()).await {
        Ok(Some(message)) => {
            println!("\n-- EVENT RECEIVED!");
            println!("   Subject: {}", message.subject);

            if let Ok(json) = serde_json::from_slice::<Value>(&message.payload) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            }

            println!("\nok Event publish/receive working correctly!");
        }
        Ok(None) => {
            println!("err Subscriber closed without receiving message");
        }
        Err(_) => {
            println!("err Timeout waiting for event");
        }
    }

    println!("\n{}\n", "=".repeat(60));
}

/// -- Test: Upload file and watch for events
#[tokio::test]
async fn test_upload_and_watch_events() {
    println!("{}\n", "=".repeat(60));
    println!("TEST: Upload file and watch NATS events");
    println!("{}\n", "=".repeat(60));

    // Connect to NATS
    println!("🔌 Connecting to NATS...");
    let nats_client = match async_nats::connect(NATS_URL).await {
        Ok(c) => c,
        Err(e) => {
            println!("err NATS connection failed: {}", e);
            return;
        }
    };

    // Subscribe to upload events
    let mut subscriber = nats_client
        .subscribe("files.upload.>".to_string())
        .await
        .unwrap();
    println!("-- Subscribed to: files.upload.>");

    // Upload a file
    let http_client = reqwest::Client::new();

    let file_content = b"Test file for event watching";
    let file_part = reqwest::multipart::Part::bytes(file_content.to_vec())
        .file_name("event-test.txt")
        .mime_str("text/plain")
        .unwrap();

    let form = reqwest::multipart::Form::new()
        .text("project_id", "event-test-project")
        .text("user_id", "event-test-user")
        .text("is_public", "true")
        .part("file", file_part);

    println!("\n-- Uploading file...");

    let upload_future = http_client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send();

    // Spawn upload in background
    let upload_handle = tokio::spawn(async move {
        match upload_future.await {
            Ok(res) => {
                let body = res.text().await.unwrap_or_default();
                if let Ok(json) = serde_json::from_str::<Value>(&body) {
                    println!("\n-- Upload Response:");
                    println!("{}", serde_json::to_string_pretty(&json).unwrap());
                }
            }
            Err(e) => println!("err Upload error: {}", e),
        }
    });

    // Watch for events
    println!("\n-- Watching for upload events (10 seconds)...\n");
    println!("{}", "-".repeat(60));

    let mut event_count = 0;
    let _watch_result = timeout(Duration::from_secs(10), async {
        while let Some(message) = subscriber.next().await {
            event_count += 1;

            println!("\n-- UPLOAD EVENT #{}", event_count);
            println!("   Subject: {}", message.subject);

            if let Ok(json) = serde_json::from_slice::<Value>(&message.payload) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            }

            println!("{}", "-".repeat(60));

            // Stop after receiving completed or failed event
            if message.subject.to_string().contains("completed")
                || message.subject.to_string().contains("failed")
            {
                break;
            }
        }
    })
    .await;

    let _ = upload_handle.await;

    println!("\n-- Summary:");
    println!("   Events captured: {}", event_count);

    if event_count > 0 {
        println!("\nok Events are being published correctly!");
    } else {
        println!("\nwarn  No events captured. Check if service is publishing to NATS.");
    }

    println!("\n{}\n", "=".repeat(60));
}

/// -- Test: List all NATS subjects being used
#[tokio::test]
async fn test_list_event_subjects() {
    println!("{}\n", "=".repeat(60));
    println!("INFO: Available NATS subjects");
    println!("{}\n", "=".repeat(60));

    println!("-- Upload Events:");
    println!("   files.upload.requested  - When upload starts");
    println!("   files.upload.completed  - When upload succeeds");
    println!("   files.upload.failed     - When upload fails");
    println!();
    println!("-- Download Events:");
    println!("   files.download.requested  - When download starts");
    println!("   files.download.completed  - When download succeeds");
    println!("   files.download.failed     - When download fails");
    println!();
    println!("-- Wildcard Subscriptions:");
    println!("   files.upload.*   - All upload events");
    println!("   files.download.* - All download events");
    println!("   files.>          - All file events");
    println!();
    println!("-- To monitor all events:");
    println!("   nats sub 'files.>'");
    println!();
    println!("-- Or use this test:");
    println!("   cargo test test_subscribe_to_events -- --nocapture");

    println!("\n{}\n", "=".repeat(60));
}
