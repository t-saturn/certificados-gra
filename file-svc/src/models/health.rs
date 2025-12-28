use serde::{Deserialize, Serialize};

/// Health status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: String,
    pub timestamp: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub database: Option<DatabaseHealth>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_server: Option<FileServerHealth>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub redis: Option<RedisHealth>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nats: Option<NatsHealth>,
}

/// Database health from file server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseHealth {
    pub status: String,
    pub engine: String,
    pub response_time_ms: u64,
    pub open_connections: u32,
    pub in_use: u32,
    pub idle: u32,
}

/// File server health
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileServerHealth {
    pub status: String,
    pub url: String,
    pub response_time_ms: u64,
}

/// Redis health
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisHealth {
    pub status: String,
    pub response_time_ms: u64,
}

/// NATS health
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NatsHealth {
    pub status: String,
    pub connected: bool,
}

impl HealthStatus {
    pub fn ok() -> Self {
        Self {
            status: "ok".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            database: None,
            file_server: None,
            redis: None,
            nats: None,
        }
    }

    pub fn with_file_server(mut self, health: FileServerHealth) -> Self {
        self.file_server = Some(health);
        self
    }

    pub fn with_database(mut self, health: DatabaseHealth) -> Self {
        self.database = Some(health);
        self
    }

    pub fn with_redis(mut self, health: RedisHealth) -> Self {
        self.redis = Some(health);
        self
    }

    pub fn with_nats(mut self, health: NatsHealth) -> Self {
        self.nats = Some(health);
        self
    }
}
