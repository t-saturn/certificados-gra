use bb8::Pool;
use bb8_redis::RedisConnectionManager;

pub type RedisPool = Pool<RedisConnectionManager>;

#[derive(Clone)]
pub struct RedisClient {
    pool: RedisPool,
}

impl RedisClient {
    pub async fn new(redis_url: &str) -> Result<Self, bb8::RunError<redis::RedisError>> {
        let manager = RedisConnectionManager::new(redis_url).unwrap();
        let pool = Pool::builder().build(manager).await?;
        Ok(Self { pool })
    }

    pub fn pool(&self) -> &RedisPool {
        &self.pool
    }
}
