use std::env;

/// HTTP server configuration
#[derive(Debug, Clone)]
pub struct HttpConfig {
    pub host: String,
    pub port: u16,
}

impl HttpConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            host: env::var("HTTP_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("HTTP_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()?,
        })
    }

    pub fn address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}
