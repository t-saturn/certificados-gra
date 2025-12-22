use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct PdfJob {
    pub job_id: Uuid,
    pub job_type: String, // "GENERATE_DOCS"
    pub event_id: Uuid,
    pub items: Vec<PdfJobItem>,
}

#[derive(Debug, Deserialize)]
pub struct PdfJobItem {
    pub client_ref: Uuid, // document_id (clave para enlazar)
    pub template: Uuid,
    pub user_id: Uuid, // UserDetailID en tu modelo Go
    pub is_public: bool,

    // Entras como arrays de objetos: [{base_url:..},{verify_code:..}] etc
    pub qr: Vec<std::collections::HashMap<String, serde_json::Value>>,
    pub qr_pdf: Vec<std::collections::HashMap<String, serde_json::Value>>,
    pub pdf: Vec<PdfField>,
}

#[derive(Debug, Deserialize)]
pub struct PdfField {
    pub key: String,
    pub value: String,
}
