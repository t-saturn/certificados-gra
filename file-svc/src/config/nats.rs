use std::env;

/// NATS configuration
#[derive(Debug, Clone)]
pub struct NatsConfig {
    pub url: String,
}

impl NatsConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            url: env::var("NATS_URL").unwrap_or_else(|_| "nats://127.0.0.1:4222".to_string()),
        })
    }
}
