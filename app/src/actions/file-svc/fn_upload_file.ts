'use server';

import type { FileUploadParams, FileUploadResponse } from '@/types/file-svc.types';

const FILE_SVC_URL = process.env.FILE_SVC_URL;

export async function uploadFile(params: FileUploadParams): Promise<FileUploadResponse> {
  if (!FILE_SVC_URL) {
    return {
      status: 'error',
      message: 'FILE_SVC_URL no está configurada',
    };
  }

  try {
    const formData = new FormData();
    formData.append('user_id', params.userId);
    formData.append('file', params.file);
    formData.append('is_public', String(params.isPublic ?? true));

    const response = await fetch(`${FILE_SVC_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        status: 'error',
        message: data.message || 'Error al subir el archivo',
        error: data.error_code,
      };
    }

    return {
      status: 'success',
      message: data.message || 'Archivo subido correctamente',
      data: data.data,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[uploadFile] Error:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Error desconocido al subir',
    };
  }
}
