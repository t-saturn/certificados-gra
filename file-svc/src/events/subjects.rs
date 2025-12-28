/// NATS subject constants
pub struct Subjects;

impl Subjects {
    // Upload events
    pub const UPLOAD_REQUESTED: &'static str = "files.upload.requested";
    pub const UPLOAD_COMPLETED: &'static str = "files.upload.completed";
    pub const UPLOAD_FAILED: &'static str = "files.upload.failed";

    // Download events
    pub const DOWNLOAD_REQUESTED: &'static str = "files.download.requested";
    pub const DOWNLOAD_COMPLETED: &'static str = "files.download.completed";
    pub const DOWNLOAD_FAILED: &'static str = "files.download.failed";

    // Wildcard subscriptions
    pub const UPLOAD_ALL: &'static str = "files.upload.*";
    pub const DOWNLOAD_ALL: &'static str = "files.download.*";
    pub const ALL: &'static str = "files.>";
}
