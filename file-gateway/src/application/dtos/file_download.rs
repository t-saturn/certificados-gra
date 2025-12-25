use bytes::Bytes;
use futures_core::Stream;
use std::pin::Pin;

pub type ByteStream = Pin<Box<dyn Stream<Item = Result<Bytes, std::io::Error>> + Send>>;

pub struct FileDownload {
    pub content_type: String,
    pub content_length: Option<u64>,
    pub stream: ByteStream,
}
