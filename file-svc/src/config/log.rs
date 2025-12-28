use std::env;

/// Logging configuration
#[derive(Debug, Clone)]
pub struct LogConfig {
    pub dir: String,
    pub file: String,
    pub max_files: u32,
}

impl LogConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            dir: env::var("LOG_DIR").unwrap_or_else(|_| "./logs".to_string()),
            file: env::var("LOG_FILE").unwrap_or_else(|_| "file-svc.log".to_string()),
            max_files: env::var("LOG_MAX_FILES")
                .unwrap_or_else(|_| "7".to_string())
                .parse()?,
        })
    }
}
