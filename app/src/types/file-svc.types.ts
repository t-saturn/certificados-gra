// ============================================
// FILE-SVC TYPES
// ============================================

// Upload Response
export interface FileUploadData {
  id: string;
  original_name: string;
  size: number;
  mime_type: string;
  is_public: boolean;
  created_at: string;
}

export interface FileUploadResponse {
  status: 'success' | 'error';
  message: string;
  data?: FileUploadData;
  error?: string;
}

// Upload Params
export interface FileUploadParams {
  userId: string;
  file: File;
  isPublic?: boolean;
}

// Download Params
export interface FileDownloadParams {
  fileId: string;
}

// Download Response (binary blob with metadata)
export interface FileDownloadResult {
  success: boolean;
  blob?: Blob;
  fileName?: string;
  mimeType?: string;
  size?: number;
  error?: string;
}

// Error Response from API
export interface FileSvcErrorResponse {
  status: 'error';
  message: string;
  error_code?: string;
}
