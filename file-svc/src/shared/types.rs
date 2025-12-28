use std::sync::Arc;

use crate::state::AppState;

/// Type alias for shared application state
pub type SharedState = Arc<AppState>;

/// Type alias for Result with AppError
pub type AppResult<T> = Result<T, crate::error::AppError>;
