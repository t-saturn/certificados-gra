use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum JobStateDto {
    Pending,
    Success,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobResultDto {
    pub file_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobErrorDto {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobStatusDto {
    pub job_id: String,
    pub state: JobStateDto,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<JobResultDto>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JobErrorDto>,
}
