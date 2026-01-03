'use server';

import type { FileDownloadParams, FileDownloadResult } from '@/types/file-svc.types';

const FILE_SVC_URL = process.env.FILE_SVC_URL;

/**
 * Descarga un archivo del file-svc
 * Retorna los bytes en base64 para procesamiento server-side
 * o para que el cliente pueda reconstruir el blob
 */
export async function downloadFile(params: FileDownloadParams): Promise<FileDownloadResult> {
  if (!FILE_SVC_URL) {
    return {
      success: false,
      error: 'FILE_SVC_URL no está configurada',
    };
  }

  try {
    const response = await fetch(`${FILE_SVC_URL}/download?file_id=${params.fileId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      // Intentar obtener mensaje de error del JSON
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.message || `Error ${response.status}`,
        };
      }
      return {
        success: false,
        error: `Error al descargar: ${response.status} ${response.statusText}`,
      };
    }

    // Extraer metadata de headers
    const contentDisposition = response.headers.get('content-disposition');
    const mimeType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');

    // Extraer nombre del archivo del header Content-Disposition
    let fileName = 'archivo';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/i);
      if (match) {
        fileName = match[1];
      }
    }

    // Obtener el blob
    const blob = await response.blob();

    return {
      success: true,
      blob,
      fileName,
      mimeType,
      size: contentLength ? parseInt(contentLength, 10) : blob.size,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[downloadFile] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al descargar',
    };
  }
}

/**
 * Obtiene la URL directa de descarga
 * Útil para descargas desde el cliente sin pasar por el server action
 */
export async function getDownloadUrl(fileId: string): Promise<string | null> {
  if (!FILE_SVC_URL) {
    return null;
  }
  return `${FILE_SVC_URL}/download?file_id=${fileId}`;
}
