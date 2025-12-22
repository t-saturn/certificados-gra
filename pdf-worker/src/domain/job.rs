use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct PdfJob {
    pub job_id: Uuid,
    #[serde(rename = "type")]
    pub job_type: String,
    pub event_id: Uuid,
    pub items: Vec<PdfJobItem>,
}

#[derive(Debug, Deserialize)]
pub struct PdfJobItem {
    pub client_ref: Uuid,
    pub template: Uuid,
    pub user_id: Uuid,
    pub is_public: bool,
    pub qr: QrData,
    pub qr_pdf: QrPdfData,
    pub pdf: Vec<PdfField>,
}

#[derive(Debug, Deserialize)]
pub struct QrData {
    pub base_url: String,
    pub verify_code: String,
}

#[derive(Debug, Deserialize)]
pub struct QrPdfData {
    pub qr_size_cm: String,
    pub qr_margin_y_cm: String,
    pub qr_margin_x_cm: String,
    pub qr_page: String,
    pub qr_rect: String,
}

#[derive(Debug, Deserialize)]
pub struct PdfField {
    pub key: String,
    pub value: String,
}
