import { createHmac } from 'crypto';

const FILE_SERVER = process.env.FILE_SERVER;
const FILE_ACCESS_KEY = process.env.FILE_ACCESS_KEY;
const FILE_SECRET_KEY = process.env.FILE_SECRET_KEY;
const FILE_PROJECT_ID = process.env.FILE_PROJECT_ID;

if (!FILE_SERVER || !FILE_ACCESS_KEY || !FILE_SECRET_KEY) {
  console.warn('[file-server] Faltan variables de entorno: FILE_SERVER, FILE_ACCESS_KEY o FILE_SECRET_KEY');
}

export type SignedHeaders = {
  'X-Access-Key': string;
  'X-Signature': string;
  'X-Timestamp': string;
  'X-Project-Id'?: string;
};

export const buildSignedHeaders = (method: string, path: string): SignedHeaders => {
  if (!FILE_ACCESS_KEY || !FILE_SECRET_KEY) {
    throw new Error('FILE_ACCESS_KEY o FILE_SECRET_KEY no configurados');
  }

  const upperMethod = method.toUpperCase();
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const stringToSign = `${upperMethod}\n${path}\n${timestamp}`;

  const signature = createHmac('sha256', FILE_SECRET_KEY).update(stringToSign, 'utf8').digest('hex');

  const headers: SignedHeaders = {
    'X-Access-Key': FILE_ACCESS_KEY,
    'X-Signature': signature,
    'X-Timestamp': timestamp,
  };

  if (FILE_PROJECT_ID) {
    headers['X-Project-Id'] = FILE_PROJECT_ID;
  }

  return headers;
};

export interface FileContentResult {
  contentType: string;
  body: string; // texto o base64
  isBinary: boolean; // true => body es base64
}

/**
 * Obtiene el contenido del archivo por file_id.
 * - Si es binario (image/pdf/etc), body = base64
 * - Si es texto, body = string normal
 */
export const fetchFileById = async (fileId: string): Promise<FileContentResult> => {
  if (!FILE_SERVER) {
    throw new Error('FILE_SERVER no configurado');
  }

  if (!fileId) {
    throw new Error('fileId es obligatorio');
  }

  const path = `/public/files/${fileId}`;
  const url = `${FILE_SERVER}${path}`;

  const headers = buildSignedHeaders('GET', path);

  const res = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    let text = '';
    try {
      text = await res.text();
    } catch {
      text = '';
    }

    console.error('[file-server] Error al obtener archivo:', {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    throw new Error('No se pudo obtener el archivo desde el file server');
  }

  const contentType = res.headers.get('Content-Type') ?? 'application/octet-stream';

  // Si es imagen, pdf u otro binario => devolvemos base64
  if (contentType.startsWith('image/') || contentType === 'application/pdf' || contentType.startsWith('application/octet-stream')) {
    const buffer = Buffer.from(await res.arrayBuffer());
    const base64 = buffer.toString('base64');

    return {
      contentType,
      body: base64,
      isBinary: true,
    };
  }

  // Si es texto, devolvemos el texto directo
  const text = await res.text();
  return {
    contentType,
    body: text,
    isBinary: false,
  };
};

// Alias por si en otra parte ya usabas este nombre
export const fetchFileContentById = fetchFileById;

// ===================== UPLOAD =====================

export interface UploadedFileData {
  id: string;
  original_name: string;
  size: number;
  mime_type: string;
  is_public: boolean;
  created_at: string;
}

interface UploadApiResponse {
  data: UploadedFileData;
  status: 'success' | 'failed';
  message: string;
}

/**
 * Sube un archivo al file server.
 * Se asume endpoint POST /files (ajusta path si tu backend usa otro).
 */
export const uploadFileToFileServer = async (userId: string, file: File, isPublic = true): Promise<UploadedFileData> => {
  if (!FILE_SERVER) {
    throw new Error('FILE_SERVER no configurado');
  }
  if (!FILE_PROJECT_ID) {
    throw new Error('FILE_PROJECT_ID no configurado');
  }

  // 👈 AQUÍ VA LA RUTA CORRECTA DE TU API
  const path = '/api/v1/files';
  const url = `${FILE_SERVER}${path}`;

  const headers = buildSignedHeaders('POST', path);

  const formData = new FormData();
  formData.append('project_id', FILE_PROJECT_ID);
  formData.append('user_id', userId);
  formData.append('is_public', isPublic ? 'true' : 'false');
  formData.append('file', file);

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    let text = '';
    try {
      text = await res.text();
    } catch {
      text = '';
    }

    console.error('[file-server] Error al subir archivo:', {
      url,
      path,
      status: res.status,
      statusText: res.statusText,
      body: text,
      contentType: res.headers.get('content-type') ?? null,
    });

    throw new Error(text || `No se pudo subir el archivo al file server (status ${res.status})`);
  }

  const json = (await res.json()) as UploadApiResponse;

  if (json.status !== 'success') {
    throw new Error(json.message || 'Error en el servicio de archivos');
  }

  return json.data;
};
