use thiserror::Error;

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("not found")]
    NotFound,
    #[error("upstream error: {0}")]
    Upstream(String),
    #[error("bad request: {0}")]
    BadRequest(String),
}
