'use server';

import { createHmac } from 'crypto';

const FILE_SERVER = process.env.FILE_SERVER;
const FILE_ACCESS_KEY = process.env.FILE_ACCESS_KEY;
const FILE_SECRET_KEY = process.env.FILE_SECRET_KEY;
const FILE_PROJECT_ID = process.env.FILE_PROJECT_ID; // opcional, por si tu backend la usa

if (!FILE_SERVER || !FILE_ACCESS_KEY || !FILE_SECRET_KEY) {
  // Opcional: puedes cambiar esto por un warning/log en vez de throw
  console.warn('[file-server] Faltan variables de entorno: FILE_SERVER, FILE_ACCESS_KEY o FILE_SECRET_KEY');
}

const buildSignatureHeaders = (method: string, path: string): { 'X-Access-Key': string; 'X-Signature': string; 'X-Timestamp': string; 'X-Project-Id'?: string } => {
  if (!FILE_ACCESS_KEY || !FILE_SECRET_KEY) {
    throw new Error('FILE_ACCESS_KEY o FILE_SECRET_KEY no configurados');
  }

  const upperMethod = method.toUpperCase();
  const timestamp = Math.floor(Date.now() / 1000).toString(); // UNIX seconds
  const stringToSign = `${upperMethod}\n${path}\n${timestamp}`;

  const signature = createHmac('sha256', FILE_SECRET_KEY).update(stringToSign, 'utf8').digest('hex');

  const headers: {
    'X-Access-Key': string;
    'X-Signature': string;
    'X-Timestamp': string;
    'X-Project-Id'?: string;
  } = {
    'X-Access-Key': FILE_ACCESS_KEY,
    'X-Signature': signature,
    'X-Timestamp': timestamp,
  };

  if (FILE_PROJECT_ID) {
    headers['X-Project-Id'] = FILE_PROJECT_ID;
  }

  return headers;
};

/**
 * Obtiene el contenido del archivo (HTML u otro) a partir del file_id.
 * Retorna el cuerpo como string (útil para HTML).
 */
export const fetchFileContentById = async (fileId: string): Promise<string> => {
  if (!FILE_SERVER) {
    throw new Error('FILE_SERVER no configurado');
  }

  if (!fileId) {
    throw new Error('fileId es obligatorio');
  }

  const path = `/public/files/${fileId}`;
  const url = `${FILE_SERVER}${path}`;

  const headers = buildSignatureHeaders('GET', path);

  const res = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[file-server] Error al obtener archivo:', {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    throw new Error('No se pudo obtener el archivo desde el file server');
  }

  // Para HTML u otros textos
  const content = await res.text();
  return content;
};
