use std::env;

use super::{FileServerConfig, HttpConfig, LogConfig, NatsConfig, RedisConfig};

/// Application settings loaded from environment variables
#[derive(Debug, Clone)]
pub struct Settings {
    pub environment: String,
    pub file_server: FileServerConfig,
    pub redis: RedisConfig,
    pub nats: NatsConfig,
    pub http: HttpConfig,
    pub log: LogConfig,
}

impl Settings {
    /// Load settings from environment variables
    pub fn load() -> anyhow::Result<Self> {
        Ok(Self {
            environment: env::var("RUST_ENV").unwrap_or_else(|_| "development".to_string()),
            file_server: FileServerConfig::from_env()?,
            redis: RedisConfig::from_env()?,
            nats: NatsConfig::from_env()?,
            http: HttpConfig::from_env()?,
            log: LogConfig::from_env()?,
        })
    }

    /// Check if running in production
    pub fn is_production(&self) -> bool {
        self.environment == "production"
    }
}
