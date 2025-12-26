use serde::Deserialize;

/// Upload request parameters (from multipart form)
#[derive(Debug, Clone, Deserialize)]
pub struct UploadParams {
    pub project_id: String,
    pub user_id: String,
    #[serde(default = "default_is_public")]
    pub is_public: bool,
}

fn default_is_public() -> bool {
    true
}

/// Health check query params
#[derive(Debug, Clone, Deserialize)]
pub struct HealthQuery {
    #[serde(default)]
    pub db: bool,
    #[serde(default)]
    pub full: bool,
}
