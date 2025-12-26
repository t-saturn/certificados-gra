use async_trait::async_trait;
use serde::{de::DeserializeOwned, Serialize};

use crate::error::Result;

/// Trait for cache operations
#[async_trait]
pub trait CacheRepositoryTrait: Send + Sync {
    /// Get value from cache
    async fn get<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>>;

    /// Set value in cache with TTL
    async fn set<T: Serialize + Send + Sync>(&self, key: &str, value: &T, ttl_secs: u64) -> Result<()>;

    /// Delete from cache
    async fn delete(&self, key: &str) -> Result<()>;

    /// Check if key exists
    async fn exists(&self, key: &str) -> Result<bool>;

    /// Ping cache server
    async fn ping(&self) -> Result<()>;
}
