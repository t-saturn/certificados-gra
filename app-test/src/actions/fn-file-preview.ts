'use server';

import { fetchFileById } from '@/lib/file-service';

export type FilePreviewResult =
  | {
      kind: 'image';
      url: string; // data URL para <Image> o <img>
      contentType: string;
    }
  | {
      kind: 'pdf';
      url: string; // data URL (si luego quieres usar <object>)
      contentType: string;
    }
  | {
      kind: 'text';
      text: string;
      contentType: string;
    };

export const fn_get_file_preview = async (fileId: string): Promise<FilePreviewResult> => {
  if (!fileId) {
    throw new Error('fileId es obligatorio');
  }

  const { contentType, body, isBinary } = await fetchFileById(fileId);

  // Imágenes
  if (contentType.startsWith('image/')) {
    const base64 = isBinary ? body : Buffer.from(body, 'utf8').toString('base64');

    const url = `data:${contentType};base64,${base64}`;

    return {
      kind: 'image',
      url,
      contentType,
    };
  }

  // PDF
  if (contentType === 'application/pdf') {
    const base64 = isBinary ? body : Buffer.from(body, 'utf8').toString('base64');

    const url = `data:${contentType};base64,${base64}`;

    return {
      kind: 'pdf',
      url,
      contentType,
    };
  }

  // Texto / HTML / otros
  return {
    kind: 'text',
    text: isBinary ? Buffer.from(body, 'base64').toString('utf8') : body,
    contentType,
  };
};
