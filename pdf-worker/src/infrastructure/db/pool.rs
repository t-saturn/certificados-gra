use sqlx::{Pool, Postgres};
use tracing::{info, instrument};

#[instrument(name = "postgres.connect", skip(pg_url))]
pub async fn connect(pg_url: &str) -> anyhow::Result<Pool<Postgres>> {
    let pool = Pool::<Postgres>::connect(pg_url).await?;

    // ping simple (sin problemas de tipos)
    sqlx::query("SELECT 1").execute(&pool).await?;

    info!("Postgres connected successfully");
    Ok(pool)
}
