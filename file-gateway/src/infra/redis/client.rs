use redis::aio::ConnectionManager;
use redis::Client;

pub type RedisConn = ConnectionManager;

#[derive(Clone)]
pub struct RedisClient {
    client: Client,
}

impl RedisClient {
    pub fn new(redis_url: &str) -> Result<Self, redis::RedisError> {
        let client = Client::open(redis_url)?;
        Ok(Self { client })
    }

    pub async fn connect(&self) -> Result<RedisConn, redis::RedisError> {
        let conn = self.client.get_tokio_connection_manager().await?;
        Ok(conn)
    }
}
