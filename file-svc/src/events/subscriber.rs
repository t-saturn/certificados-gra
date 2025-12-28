use async_nats::{Client, Subscriber};
use futures_util::StreamExt;
use tracing::{error, info, instrument, warn};

use crate::error::{AppError, Result};

use super::payloads::EventEnvelope;

/// Event subscriber for NATS
pub struct EventSubscriber {
    client: Client,
}

impl EventSubscriber {
    pub fn new(client: Client) -> Self {
        Self { client }
    }

    /// Subscribe to a subject
    #[instrument(skip(self))]
    pub async fn subscribe(&self, subject: &str) -> Result<Subscriber> {
        let subscriber = self
            .client
            .subscribe(subject.to_string())
            .await
            .map_err(|e| AppError::Nats(e.to_string()))?;

        info!(subject = %subject, "Subscribed to subject");
        Ok(subscriber)
    }

    /// Process messages with a handler function
    pub async fn process<F, Fut>(subscriber: &mut Subscriber, handler: F) -> Result<()>
    where
        F: Fn(EventEnvelope<serde_json::Value>) -> Fut,
        Fut: std::future::Future<Output = Result<()>>,
    {
        while let Some(message) = subscriber.next().await {
            let subject = message.subject.to_string();

            match serde_json::from_slice::<EventEnvelope<serde_json::Value>>(&message.payload) {
                Ok(envelope) => {
                    info!(
                        event_id = %envelope.event_id,
                        event_type = %envelope.event_type,
                        subject = %subject,
                        "Processing event"
                    );

                    if let Err(e) = handler(envelope).await {
                        error!(error = %e, subject = %subject, "Failed to process event");
                    }
                }
                Err(e) => {
                    warn!(
                        error = %e,
                        subject = %subject,
                        "Failed to deserialize event"
                    );
                }
            }
        }

        Ok(())
    }
}
