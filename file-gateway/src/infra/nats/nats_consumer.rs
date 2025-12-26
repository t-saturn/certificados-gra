use futures_util::StreamExt;
use tracing::{info, warn};

use crate::application::dtos::UploadRequestedEvent;
use crate::application::services::JobService;

pub async fn start_upload_consumer(
    client: async_nats::Client,
    job_service: JobService,
) -> Result<(), String> {
    let mut sub = client
        .subscribe("files.upload.requested".to_string())
        .await
        .map_err(|e| e.to_string())?;

    info!("NATS consumer started subject=files.upload.requested");

    while let Some(msg) = sub.next().await {
        let payload = msg.payload;

        info!(len = payload.len(), raw = %String::from_utf8_lossy(&payload), "nats message received");

        let evt: Result<UploadRequestedEvent, _> = serde_json::from_slice(&payload);

        match evt {
            Ok(e) => {
                let svc = job_service.clone();
                // procesar en task (concurrency)
                tokio::spawn(async move {
                    svc.handle_upload_requested(e).await;
                });
            }
            Err(err) => {
                warn!(error=%err, "invalid event payload");
            }
        }
    }
    Ok(())
}
