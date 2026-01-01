/* eslint-disable @typescript-eslint/no-explicit-any */
// src/actions/fn-file-upload.ts
'use server';

import { auth } from '@/lib/auth';
import { uploadFileToFileServer, type UploadedFileData } from '@/lib/file-service';

export type UploadResult = {
  id: string;
};

// Si quieres, puedes exportar esto y reutilizarlo en otros actions
const getCurrentUserId = async (): Promise<string> => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Sesión inválida: no se encontró el usuario autenticado');
  }
  return session.user.id;
};

/**
 * Sube el archivo HTML de la plantilla al file-server
 * y devuelve solo el ID (file_id).
 */
export const fn_upload_template_file = async (file: File): Promise<UploadResult> => {
  if (!file) {
    throw new Error('El archivo de plantilla es obligatorio');
  }

  try {
    const userId = await getCurrentUserId();

    const uploaded: UploadedFileData = await uploadFileToFileServer(userId, file, true);

    return {
      id: uploaded.id,
    };
  } catch (error: any) {
    console.error('[fn_upload_template_file] Error al subir archivo de plantilla:', error);
    throw new Error(error?.message || 'No se pudo subir el archivo de plantilla');
  }
};

/**
 * Sube la imagen de previsualización de la plantilla al file-server
 * y devuelve solo el ID (prev_file_id).
 */
export const fn_upload_preview_image = async (file: File): Promise<UploadResult> => {
  if (!file) {
    throw new Error('La imagen de previsualización es obligatoria');
  }

  try {
    const userId = await getCurrentUserId();

    const uploaded: UploadedFileData = await uploadFileToFileServer(userId, file, true);

    return {
      id: uploaded.id,
    };
  } catch (error: any) {
    console.error('[fn_upload_preview_image] Error al subir imagen de previsualización:', error);
    throw new Error(error?.message || 'No se pudo subir la imagen de previsualización');
  }
};
