mod upload_worker;
mod download_worker;

use std::sync::Arc;

use futures_util::StreamExt;
use tracing::{error, info, warn};

use crate::error::Result;
use crate::events::{EventSubscriber, Subjects};
use crate::state::AppState;

pub use upload_worker::UploadWorker;
pub use download_worker::DownloadWorker;

/// Start all event workers
pub async fn start_workers(state: Arc<AppState>) -> Result<()> {
    let subscriber = EventSubscriber::new(state.nats_client().clone());

    info!("Starting event workers...");

    // Subscribe to all file events
    let mut sub = subscriber.subscribe(Subjects::ALL).await?;

    info!("Subscribed to: {}", Subjects::ALL);

    while let Some(message) = sub.next().await {
        let subject = message.subject.to_string();

        match serde_json::from_slice::<serde_json::Value>(&message.payload) {
            Ok(envelope) => {
                info!(
                    subject = %subject,
                    "Received event"
                );

                // Route to appropriate worker
                match subject.as_str() {
                    s if s.starts_with("files.upload") => {
                        if let Err(e) = UploadWorker::handle(&state, &subject, &envelope).await {
                            error!(error = %e, subject = %subject, "Upload worker error");
                        }
                    }
                    s if s.starts_with("files.download") => {
                        if let Err(e) = DownloadWorker::handle(&state, &subject, &envelope).await {
                            error!(error = %e, subject = %subject, "Download worker error");
                        }
                    }
                    _ => {
                        warn!(subject = %subject, "Unknown event subject");
                    }
                }
            }
            Err(e) => {
                warn!(error = %e, subject = %subject, "Failed to parse event");
            }
        }
    }

    Ok(())
}
