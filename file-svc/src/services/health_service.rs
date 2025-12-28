use std::sync::Arc;
use std::time::Instant;

use tracing::instrument;

use crate::error::Result;
use crate::models::{HealthStatus, NatsHealth, RedisHealth};
use crate::repositories::traits::{CacheRepositoryTrait, FileRepositoryTrait};

/// Service for health checks
pub struct HealthService<F, C>
where
    F: FileRepositoryTrait,
    C: CacheRepositoryTrait,
{
    file_repo: Arc<F>,
    cache_repo: Arc<C>,
    nats_connected: bool,
}

impl<F, C> HealthService<F, C>
where
    F: FileRepositoryTrait,
    C: CacheRepositoryTrait,
{
    pub fn new(file_repo: Arc<F>, cache_repo: Arc<C>, nats_connected: bool) -> Self {
        Self {
            file_repo,
            cache_repo,
            nats_connected,
        }
    }

    /// Basic health check (just this service)
    #[instrument(skip(self))]
    pub async fn check(&self) -> Result<HealthStatus> {
        Ok(HealthStatus::ok())
    }

    /// Health check with file server status
    #[instrument(skip(self))]
    pub async fn check_with_db(&self, check_db: bool) -> Result<HealthStatus> {
        let health = self.file_repo.health(check_db).await?;
        Ok(health)
    }

    /// Full health check (all dependencies)
    #[instrument(skip(self))]
    pub async fn check_full(&self) -> Result<HealthStatus> {
        let mut health = self.file_repo.health(true).await?;

        // Check Redis
        let redis_start = Instant::now();
        let redis_status = match self.cache_repo.ping().await {
            Ok(_) => RedisHealth {
                status: "up".to_string(),
                response_time_ms: redis_start.elapsed().as_millis() as u64,
            },
            Err(_) => RedisHealth {
                status: "down".to_string(),
                response_time_ms: 0,
            },
        };
        health = health.with_redis(redis_status);

        // Check NATS
        let nats_status = NatsHealth {
            status: if self.nats_connected { "up" } else { "down" }.to_string(),
            connected: self.nats_connected,
        };
        health = health.with_nats(nats_status);

        Ok(health)
    }
}
