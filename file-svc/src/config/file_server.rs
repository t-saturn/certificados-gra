use std::env;

/// Configuration for the external file server
#[derive(Debug, Clone)]
pub struct FileServerConfig {
    /// Base URL: https://files-demo.regionayacucho.gob.pe
    pub base_url: String,
    /// Public URL: https://files-demo.regionayacucho.gob.pe/public
    pub public_url: String,
    /// API URL: https://files-demo.regionayacucho.gob.pe/api/v1
    pub api_url: String,
    /// Access key for API authentication
    pub access_key: String,
    /// Secret key for HMAC signature
    pub secret_key: String,
    /// Default project ID
    pub project_id: String,
}

impl FileServerConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            base_url: env::var("FILE_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:8000".to_string()),
            public_url: env::var("FILE_PUBLIC_URL")
                .unwrap_or_else(|_| "http://localhost:8000/public".to_string()),
            api_url: env::var("FILE_API_URL")
                .unwrap_or_else(|_| "http://localhost:8000/api/v1".to_string()),
            access_key: env::var("FILE_ACCESS_KEY")?,
            secret_key: env::var("FILE_SECRET_KEY")?,
            project_id: env::var("FILE_PROJECT_ID")?,
        })
    }

    /// Get health endpoint URL
    pub fn health_url(&self) -> String {
        format!("{}/health", self.base_url)
    }

    /// Get health with database check URL
    pub fn health_db_url(&self) -> String {
        format!("{}/health?db=true", self.base_url)
    }

    /// Get files API endpoint
    pub fn files_endpoint(&self) -> String {
        format!("{}/files", self.api_url)
    }

    /// Get public file URL by ID
    pub fn public_file_url(&self, file_id: &str) -> String {
        format!("{}/files/{}", self.public_url, file_id)
    }
}
