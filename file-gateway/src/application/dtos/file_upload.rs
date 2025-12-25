#[derive(Debug, Clone)]
pub struct UploadFileCommand {
    pub user_id: String,
    pub is_public: bool,
    pub filename: String,
    pub content_type: String,
    pub content: Vec<u8>,
}

#[derive(Debug, Clone)]
pub struct UploadedFileData {
    pub id: String,
    pub original_name: String,
    pub size: u64,
    pub mime_type: String,
    pub is_public: bool,
    pub created_at: String,
}
