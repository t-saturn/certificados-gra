use async_nats::Client;
use serde::Serialize;
use tracing::{info, instrument};

use crate::error::{AppError, Result};

use super::payloads::EventEnvelope;

/// Event publisher for NATS
#[derive(Clone)]
pub struct EventPublisher {
    client: Client,
}

impl EventPublisher {
    pub fn new(client: Client) -> Self {
        Self { client }
    }

    /// Publish an event to a subject
    #[instrument(skip(self, payload), fields(subject = %subject))]
    pub async fn publish<T: Serialize + std::fmt::Debug>(
        &self,
        subject: &str,
        payload: T,
    ) -> Result<()> {
        let envelope = EventEnvelope::new(subject, payload);
        let data = serde_json::to_vec(&envelope)?;

        self.client
            .publish(subject.to_string(), data.into())
            .await
            .map_err(|e| AppError::Nats(e.to_string()))?;

        info!(
            event_id = %envelope.event_id,
            "Event published successfully"
        );

        Ok(())
    }

    /// Publish with custom event type
    #[instrument(skip(self, payload))]
    pub async fn publish_with_type<T: Serialize + std::fmt::Debug>(
        &self,
        subject: &str,
        event_type: &str,
        payload: T,
    ) -> Result<()> {
        let mut envelope = EventEnvelope::new(event_type, payload);
        envelope.event_type = event_type.to_string();
        let data = serde_json::to_vec(&envelope)?;

        self.client
            .publish(subject.to_string(), data.into())
            .await
            .map_err(|e| AppError::Nats(e.to_string()))?;

        info!(
            event_id = %envelope.event_id,
            event_type = %event_type,
            subject = %subject,
            "Event published"
        );

        Ok(())
    }
}
