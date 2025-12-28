use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

/// Service for generating HMAC-SHA256 signatures
pub struct SignatureService {
    access_key: String,
    secret_key: String,
}

impl SignatureService {
    pub fn new(access_key: String, secret_key: String) -> Self {
        Self {
            access_key,
            secret_key,
        }
    }

    /// Generate timestamp and signature for API request
    /// Returns (timestamp, signature)
    pub fn generate(&self, method: &str, path: &str) -> (String, String) {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
            .to_string();

        let string_to_sign = format!("{}\n{}\n{}", method.to_uppercase(), path, timestamp);

        let mut mac = HmacSha256::new_from_slice(self.secret_key.as_bytes())
            .expect("HMAC can take key of any size");
        mac.update(string_to_sign.as_bytes());

        let signature = hex::encode(mac.finalize().into_bytes());

        (timestamp, signature)
    }

    /// Get access key
    pub fn access_key(&self) -> &str {
        &self.access_key
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_signature_generation() {
        let service = SignatureService::new(
            "test_access_key".to_string(),
            "test_secret_key".to_string(),
        );

        let (timestamp, signature) = service.generate("POST", "/api/v1/files");

        assert!(!timestamp.is_empty());
        assert!(!signature.is_empty());
        assert_eq!(signature.len(), 64); // SHA256 hex = 64 chars
    }
}
