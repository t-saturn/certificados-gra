#![allow(dead_code)]
use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct PdfJob {
    pub job_id: Uuid,
    pub event_id: Uuid,
    pub documents: Vec<PdfDocumentTask>,
}

#[derive(Debug, Deserialize)]
pub struct PdfDocumentTask {
    pub document_id: Uuid,
    pub template_id: Uuid,
    pub user_id: Uuid,
    pub verify_code: String,
    pub pdf_data: Vec<PdfField>,
}

#[derive(Debug, Deserialize)]
pub struct PdfField {
    pub key: String,
    pub value: String,
}
