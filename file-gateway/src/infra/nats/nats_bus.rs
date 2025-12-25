use crate::application::ports::EventBus;
use async_trait::async_trait;

#[derive(Clone)]
pub struct NatsEventBus {
    client: async_nats::Client,
}

impl NatsEventBus {
    pub fn new(client: async_nats::Client) -> Self {
        Self { client }
    }
}

#[async_trait]
impl EventBus for NatsEventBus {
    async fn publish(&self, subject: &str, payload: Vec<u8>) -> Result<(), String> {
        self.client
            .publish(subject.to_string(), payload.into())
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
