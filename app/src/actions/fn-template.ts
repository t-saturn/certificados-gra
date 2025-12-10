'use server';

import { auth } from '@/lib/auth';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

export const getCurrentUserId = async (): Promise<string> => {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Sesión inválida');
  return session.user.id;
};

/* ---------- CREATE TEMPLATE ---------- */

export interface CreateTemplateBody {
  name: string;
  description: string;
  document_type_id: string;
  category_id: number;
  file_id?: string;
  prev_file_id?: string;
  is_active: boolean;
}

export interface CreateTemplateApiData {
  id: string;
  name: string;
  message: string;
}

interface CreateTemplateApiResponse {
  data: CreateTemplateApiData;
  status: 'success' | 'failed';
  message: string;
}

export interface CreateTemplateResult {
  id: string;
  name: string;
  message: string;
}

export type FnCreateTemplate = (body: CreateTemplateBody) => Promise<CreateTemplateResult>;

export const fn_create_template: FnCreateTemplate = async (body) => {
  const userId = await getCurrentUserId();

  const url = `${BASE_URL}/template?user_id=${encodeURIComponent(userId)}`;

  // 👀 Log rápido para ver qué estás mandando
  console.log('[fn_create_template] URL:', url);
  console.log('[fn_create_template] Body:', body);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    let text = '';
    try {
      text = await res.text();
    } catch {
      text = '';
    }

    console.error('Error al consumir POST /template =>', {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    // 🔴 MUY IMPORTANTE: propagar el mensaje real
    throw new Error(text || `Error al crear la plantilla (status ${res.status})`);
  }

  let json: CreateTemplateApiResponse;
  try {
    json = (await res.json()) as CreateTemplateApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de /template =>', err);
    throw new Error('Respuesta inválida del servicio de plantillas');
  }

  if (json.status !== 'success') {
    console.error('Servicio /template respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de plantillas');
  }

  return {
    id: json.data.id,
    name: json.data.name,
    message: json.data.message,
  };
};

// ---- Tipos ----
export interface GetTemplatesParams {
  page?: number;
  page_size?: number;
  search_query?: string;
  type?: string; // ej: "certificate"
}

export interface TemplateItem {
  id: string;
  name: string;
  description: string;
  document_type_id: string;
  document_type_code: string; // "CERTIFICATE"
  document_type_name: string; // "Certificado"
  category_id: number;
  category_name: string;
  file_id: string;
  prev_file_id?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TemplatesFilters {
  page: number;
  page_size: number;
  total: number;
  has_next_page: boolean;
  has_prev_page: boolean;
  search_query?: string;
  type?: string;
}

export interface TemplatesResult {
  templates: TemplateItem[];
  filters: TemplatesFilters;
}

// lo que devuelve el backend
interface TemplatesApiResponse {
  data: {
    data: TemplateItem[];
    filters: TemplatesFilters;
  };
  status: 'success' | 'failed';
  message: string;
}

export type FnGetTemplates = (params?: GetTemplatesParams) => Promise<TemplatesResult>;

// ---- Server Action ----
export const fn_get_templates: FnGetTemplates = async (params = {}) => {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.page_size !== undefined) searchParams.set('page_size', String(params.page_size));
  if (params.search_query) searchParams.set('search_query', params.search_query);
  if (params.type) searchParams.set('type', params.type);

  const queryString = searchParams.toString();
  const url = `${BASE_URL}/templates${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store', // para que siempre traiga lo último
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Error al consumir /templates:', text);
    throw new Error('Error al obtener las plantillas');
  }

  const json = (await res.json()) as TemplatesApiResponse;

  if (json.status !== 'success') {
    throw new Error(json.message || 'Error en el servicio de plantillas');
  }

  // Normalizamos lo que devuelve el server action
  return {
    templates: json.data.data,
    filters: json.data.filters,
  };
};

export interface UpdateTemplateBody {
  name?: string;
  description?: string;
  document_type_id?: string;
  category_id?: number;
  file_id?: string;
  prev_file_id?: string;
  is_active?: boolean; // <- usar false para “eliminar” lógicamente
}

export interface UpdateTemplateApiData {
  id: string;
  name: string;
  message: string;
}

interface UpdateTemplateApiResponse {
  data: UpdateTemplateApiData;
  status: 'success' | 'failed';
  message: string;
}

export interface UpdateTemplateResult {
  id: string;
  name: string;
  message: string;
}

export type FnUpdateTemplate = (templateId: string, body: UpdateTemplateBody) => Promise<UpdateTemplateResult>;

export const fn_update_template: FnUpdateTemplate = async (templateId, body) => {
  if (!templateId) {
    throw new Error('El ID de la plantilla es obligatorio');
  }

  const userId = await getCurrentUserId();

  const url = `${BASE_URL}/template/${templateId}?user_id=${encodeURIComponent(userId)}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Error al consumir PATCH /template/:id =>', text);
    throw new Error('Error al actualizar la plantilla');
  }

  const json = (await res.json()) as UpdateTemplateApiResponse;

  if (json.status !== 'success') {
    throw new Error(json.message || 'Error en el servicio de plantillas');
  }

  return {
    id: json.data.id,
    name: json.data.name,
    message: json.data.message,
  };
};
