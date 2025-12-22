use sqlx::{Pool, Postgres};
use tracing::{info, instrument};
use uuid::Uuid;

pub struct DocumentsRepository {
    pool: Pool<Postgres>,
}

impl DocumentsRepository {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }

    #[instrument(name = "db.documents.set_file_id", skip(self), fields(document_id = %document_id, file_id = %file_id))]
    pub async fn set_file_id(&self, document_id: Uuid, file_id: Uuid) -> anyhow::Result<u64> {
        let res = sqlx::query(
            r#"
            UPDATE documents
            SET file_id = $1,
                status = 'PDF_GENERATED',
                updated_at = now()
            WHERE id = $2
            "#,
        )
        .bind(file_id)
        .bind(document_id)
        .execute(&self.pool)
        .await?;

        let rows = res.rows_affected();
        info!(rows, "Document updated");
        Ok(rows)
    }

    #[instrument(name = "db.documents.mark_failed", skip(self), fields(document_id = %document_id))]
    pub async fn mark_failed(&self, document_id: Uuid) -> anyhow::Result<u64> {
        let res = sqlx::query(
            r#"
            UPDATE documents
            SET status = 'PDF_FAILED',
                updated_at = now()
            WHERE id = $1
            "#,
        )
        .bind(document_id)
        .execute(&self.pool)
        .await?;

        Ok(res.rows_affected())
    }
}
