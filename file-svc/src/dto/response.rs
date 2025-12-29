use serde::Serialize;

/// Generic API response wrapper
#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub data: T,
    pub status: String,
    pub message: String,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T, message: impl Into<String>) -> Self {
        Self {
            data,
            status: "success".to_string(),
            message: message.into(),
        }
    }
}

/// File server response wrapper (for deserializing external API responses)
#[derive(Debug, serde::Deserialize)]
pub struct FileServerResponse<T> {
    pub data: T,
    pub status: String,
    pub message: String,
}

/// Error response from file server
#[derive(Debug, serde::Deserialize)]
pub struct FileServerErrorResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<serde_json::Value>,
    pub error: Option<FileServerError>,
}

#[derive(Debug, serde::Deserialize)]
pub struct FileServerError {
    pub code: String,
    pub details: String,
}
