use std::sync::Arc;

use async_nats::Client as NatsClient;
use tracing::info;

use crate::config::Settings;
use crate::error::Result;
use crate::events::EventPublisher;
use crate::repositories::{FileServerRepository, RedisCacheRepository, RedisQueueRepository};
use crate::services::{DownloadService, HealthService, UploadService};

/// Application state shared across handlers
pub struct AppState {
    settings: Settings,
    file_repo: Arc<FileServerRepository>,
    cache_repo: Arc<RedisCacheRepository>,
    queue_repo: Arc<RedisQueueRepository>,
    nats_client: NatsClient,
    event_publisher: EventPublisher,
}

impl AppState {
    pub async fn new(settings: &Settings) -> Result<Self> {
        info!("Initializing application state...");

        // Initialize file server repository
        let file_repo = Arc::new(FileServerRepository::new(settings.file_server.clone()));
        info!("File server repository initialized");

        // Initialize Redis cache
        let cache_repo = Arc::new(RedisCacheRepository::new(settings.redis.clone()).await?);
        info!("Redis cache repository initialized");

        // Initialize Redis queue
        let queue_repo = Arc::new(RedisQueueRepository::new(settings.redis.clone()).await?);
        info!("Redis queue repository initialized");

        // Initialize NATS client
        let nats_client = async_nats::connect(&settings.nats.url).await.map_err(|e| {
            crate::error::AppError::Nats(format!("Failed to connect to NATS: {}", e))
        })?;
        info!("NATS client connected to {}", settings.nats.url);

        let event_publisher = EventPublisher::new(nats_client.clone());

        Ok(Self {
            settings: settings.clone(),
            file_repo,
            cache_repo,
            queue_repo,
            nats_client,
            event_publisher,
        })
    }

    // === Getters ===

    pub fn settings(&self) -> &Settings {
        &self.settings
    }

    pub fn nats_client(&self) -> &NatsClient {
        &self.nats_client
    }

    pub fn event_publisher(&self) -> &EventPublisher {
        &self.event_publisher
    }

    pub fn file_repo(&self) -> &Arc<FileServerRepository> {
        &self.file_repo
    }

    pub fn queue_repo(&self) -> &Arc<RedisQueueRepository> {
        &self.queue_repo
    }

    // === Service factories ===

    pub fn health_service(&self) -> HealthService<FileServerRepository, RedisCacheRepository> {
        HealthService::new(
            Arc::clone(&self.file_repo),
            Arc::clone(&self.cache_repo),
            true, // NATS connected
        )
    }

    pub fn upload_service(&self) -> UploadService<FileServerRepository> {
        UploadService::new(Arc::clone(&self.file_repo), self.event_publisher.clone())
    }

    pub fn download_service(&self) -> DownloadService<FileServerRepository> {
        DownloadService::new(
            Arc::clone(&self.file_repo),
            self.event_publisher.clone(),
            self.settings.file_server.project_id.clone(), // <-- Tercer argumento
        )
    }
}
