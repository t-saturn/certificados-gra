use async_trait::async_trait;
use redis::aio::ConnectionManager;
use redis::AsyncCommands;
use serde::{de::DeserializeOwned, Serialize};
use tracing::instrument;

use crate::config::RedisConfig;
use crate::error::Result;

use super::traits::CacheRepositoryTrait;

/// Redis cache repository implementation
#[derive(Clone)]
pub struct RedisCacheRepository {
    conn: ConnectionManager,
    config: RedisConfig,
}

impl RedisCacheRepository {
    pub async fn new(config: RedisConfig) -> Result<Self> {
        let client = redis::Client::open(config.connection_url())?;
        let conn = ConnectionManager::new(client).await?;

        Ok(Self { conn, config })
    }

    fn prefixed_key(&self, key: &str) -> String {
        self.config.key(key)
    }
}

#[async_trait]
impl CacheRepositoryTrait for RedisCacheRepository {
    #[instrument(skip(self))]
    async fn get<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>> {
        let mut conn = self.conn.clone();
        let prefixed = self.prefixed_key(key);

        let value: Option<String> = conn.get(&prefixed).await?;

        match value {
            Some(v) => {
                let parsed: T = serde_json::from_str(&v)?;
                Ok(Some(parsed))
            }
            None => Ok(None),
        }
    }

    #[instrument(skip(self, value))]
    async fn set<T: Serialize + Send + Sync>(&self, key: &str, value: &T, ttl_secs: u64) -> Result<()> {
        let mut conn = self.conn.clone();
        let prefixed = self.prefixed_key(key);
        let serialized = serde_json::to_string(value)?;

        conn.set_ex(&prefixed, serialized, ttl_secs).await?;
        Ok(())
    }

    #[instrument(skip(self))]
    async fn delete(&self, key: &str) -> Result<()> {
        let mut conn = self.conn.clone();
        let prefixed = self.prefixed_key(key);

        conn.del(&prefixed).await?;
        Ok(())
    }

    #[instrument(skip(self))]
    async fn exists(&self, key: &str) -> Result<bool> {
        let mut conn = self.conn.clone();
        let prefixed = self.prefixed_key(key);

        let exists: bool = conn.exists(&prefixed).await?;
        Ok(exists)
    }

    #[instrument(skip(self))]
    async fn ping(&self) -> Result<()> {
        let mut conn = self.conn.clone();
        redis::cmd("PING").query_async(&mut conn).await?;
        Ok(())
    }
}
