'use server';

import { auth } from '@/lib/auth';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

/* ---------- UTIL ---------- */

export const getCurrentUserId = async (): Promise<string> => {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Sesión inválida');
  return session.user.id;
};

/* ---------- TIPOS: GET /document-templates ---------- */

export interface GetDocumentTemplatesParams {
  page?: number;
  page_size?: number;
  search_query?: string;
  is_active?: boolean; // por defecto mandamos true si no viene
  template_type_code?: string; // CERTIFICATE, etc.
  template_category_code?: string; // CUR, etc.
}

export interface DocumentTemplateItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  document_type_id: string;
  document_type_code: string;
  document_type_name: string;
  category_id: number;
  category_code: string;
  category_name: string;
  file_id: string;
  prev_file_id: string;
}

export interface DocumentTemplatesPagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_prev_page: boolean;
  has_next_page: boolean;
}

export interface DocumentTemplatesFilters {
  search_query?: string | null;
  is_active?: boolean;
  template_type_code?: string | null;
  template_category_code?: string | null;
}

interface DocumentTemplatesApiResponse {
  data: {
    items: DocumentTemplateItem[];
    pagination: DocumentTemplatesPagination;
    filters: DocumentTemplatesFilters;
  };
  status: 'success' | 'failed';
  message: string;
}

export interface DocumentTemplatesResult {
  items: DocumentTemplateItem[];
  pagination: DocumentTemplatesPagination;
  filters: DocumentTemplatesFilters;
}

export type FnGetDocumentTemplates = (params?: GetDocumentTemplatesParams) => Promise<DocumentTemplatesResult>;

/* ---------- SERVER ACTION: GET /document-templates ---------- */

export const fn_get_document_templates: FnGetDocumentTemplates = async (params = {}) => {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.set('page', String(params.page));
  }

  if (params.page_size !== undefined) {
    searchParams.set('page_size', String(params.page_size));
  }

  if (params.search_query) {
    searchParams.set('search_query', params.search_query);
  }

  if (params.template_type_code) {
    searchParams.set('template_type_code', params.template_type_code);
  }

  if (params.template_category_code) {
    searchParams.set('template_category_code', params.template_category_code);
  }

  // is_active: por defecto true si no viene nada
  if (params.is_active === undefined) {
    searchParams.set('is_active', 'true');
  } else {
    searchParams.set('is_active', String(params.is_active));
  }

  const queryString = searchParams.toString();
  const url = `${BASE_URL}/document-templates${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    let text = '';
    try {
      text = await res.text();
    } catch {
      text = '';
    }

    console.error('Error al consumir GET /document-templates =>', {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    throw new Error(text || 'Error al obtener las plantillas de documento');
  }

  let json: DocumentTemplatesApiResponse;
  try {
    json = (await res.json()) as DocumentTemplatesApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de /document-templates =>', err);
    throw new Error('Respuesta inválida del servicio de plantillas de documento');
  }

  if (json.status !== 'success') {
    console.error('Servicio /document-templates respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de plantillas de documento');
  }

  return {
    items: json.data.items,
    pagination: json.data.pagination,
    filters: json.data.filters,
  };
};

/* ---------- TIPOS: POST /document-template ---------- */

export interface CreateDocumentTemplateBody {
  doc_type_code: string; // "CERTIFICATE"
  doc_category_code: string; // "CUR"
  code: string; // "CERT_CURSO_BASICO"
  name: string;
  description?: string;
  file_id: string;
  prev_file_id?: string;
  is_active?: boolean; // si no lo envías, que tu backend le ponga default true
}

interface CreateDocumentTemplateApiData {
  message: string; // "Document template created successfully"
}

interface CreateDocumentTemplateApiResponse {
  data: CreateDocumentTemplateApiData | null;
  status: 'success' | 'failed';
  message: string; // en failed: "document template with code '...' already exists"
}

export interface CreateDocumentTemplateResult {
  message: string;
}

export type FnCreateDocumentTemplate = (body: CreateDocumentTemplateBody) => Promise<CreateDocumentTemplateResult>;

/* ---------- SERVER ACTION: POST /document-template ---------- */

export const fn_create_document_template: FnCreateDocumentTemplate = async (body) => {
  const userId = await getCurrentUserId();

  const url = `${BASE_URL}/document-template?user_id=${encodeURIComponent(userId)}`;

  console.log('[fn_create_document_template] URL:', url);
  console.log('[fn_create_document_template] Body:', body);

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

    console.error('Error al consumir POST /document-template =>', {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    // Propagamos el mensaje real del backend si viene
    throw new Error(text || `Error al crear la plantilla de documento (status ${res.status})`);
  }

  let json: CreateDocumentTemplateApiResponse;
  try {
    json = (await res.json()) as CreateDocumentTemplateApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de /document-template =>', err);
    throw new Error('Respuesta inválida del servicio de plantillas de documento');
  }

  if (json.status !== 'success') {
    console.error('Servicio /document-template respondió failed =>', json);
    // ej: "document template with code 'CERT_CURSO_BASICO' already exists"
    throw new Error(json.message || 'Error en el servicio de plantillas de documento');
  }

  return {
    message: json.data?.message ?? 'Plantilla de documento creada correctamente',
  };
};

/* ---------- UPDATE: PATCH /document-template/:id ---------- */

export interface UpdateDocumentTemplateBody {
  code?: string;
  name?: string;
  description?: string;
  file_id?: string;
  prev_file_id?: string;
  is_active?: boolean;
}

interface UpdateDocumentTemplateApiData {
  message: string; // "Document template updated successfully"
}

interface UpdateDocumentTemplateApiResponse {
  data: UpdateDocumentTemplateApiData | null;
  status: 'success' | 'failed';
  message: string;
}

export interface UpdateDocumentTemplateResult {
  message: string;
}

export type FnUpdateDocumentTemplate = (id: string, body: UpdateDocumentTemplateBody) => Promise<UpdateDocumentTemplateResult>;

export const fn_update_document_template: FnUpdateDocumentTemplate = async (id, body) => {
  if (!id) {
    throw new Error('El id de la plantilla de documento es obligatorio');
  }

  const url = `${BASE_URL}/document-template/${encodeURIComponent(id)}`;

  console.log('[fn_update_document_template] URL:', url);
  console.log('[fn_update_document_template] Body:', body);

  const res = await fetch(url, {
    method: 'PATCH',
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

    console.error('Error al consumir PATCH /document-template/:id =>', {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    throw new Error(text || `Error al actualizar la plantilla de documento (status ${res.status})`);
  }

  let json: UpdateDocumentTemplateApiResponse;
  try {
    json = (await res.json()) as UpdateDocumentTemplateApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de PATCH /document-template/:id =>', err);
    throw new Error('Respuesta inválida del servicio de plantillas de documento');
  }

  if (json.status !== 'success') {
    console.error('Servicio PATCH /document-template/:id respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de plantillas de documento');
  }

  return {
    message: json.data?.message ?? 'Plantilla de documento actualizada correctamente',
  };
};

/* ---------- DISABLE: PATCH /document-template/:id/disable ---------- */

interface ToggleDocumentTemplateApiData {
  message: string; // "Document template disabled successfully" / "enabled successfully"
}

interface ToggleDocumentTemplateApiResponse {
  data: ToggleDocumentTemplateApiData | null;
  status: 'success' | 'failed';
  message: string;
}

export interface ToggleDocumentTemplateResult {
  message: string;
}

export type FnDisableDocumentTemplate = (id: string) => Promise<ToggleDocumentTemplateResult>;
export type FnEnableDocumentTemplate = (id: string) => Promise<ToggleDocumentTemplateResult>;

export const fn_disable_document_template: FnDisableDocumentTemplate = async (id) => {
  if (!id) {
    throw new Error('El id de la plantilla de documento es obligatorio');
  }

  const url = `${BASE_URL}/document-template/${encodeURIComponent(id)}/disable`;

  console.log('[fn_disable_document_template] URL:', url);

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    let text = '';
    try {
      text = await res.text();
    } catch {
      text = '';
    }

    console.error('Error al consumir PATCH /document-template/:id/disable =>', {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    throw new Error(text || `Error al deshabilitar la plantilla de documento (status ${res.status})`);
  }

  let json: ToggleDocumentTemplateApiResponse;
  try {
    json = (await res.json()) as ToggleDocumentTemplateApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de PATCH /document-template/:id/disable =>', err);
    throw new Error('Respuesta inválida del servicio de plantillas de documento');
  }

  if (json.status !== 'success') {
    console.error('Servicio PATCH /document-template/:id/disable respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de plantillas de documento');
  }

  return {
    message: json.data?.message ?? 'Plantilla de documento deshabilitada correctamente',
  };
};

/* ---------- ENABLE: PATCH /document-template/:id/enable ---------- */

export const fn_enable_document_template: FnEnableDocumentTemplate = async (id) => {
  if (!id) {
    throw new Error('El id de la plantilla de documento es obligatorio');
  }

  const url = `${BASE_URL}/document-template/${encodeURIComponent(id)}/enable`;

  console.log('[fn_enable_document_template] URL:', url);

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    let text = '';
    try {
      text = await res.text();
    } catch {
      text = '';
    }

    console.error('Error al consumir PATCH /document-template/:id/enable =>', {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    throw new Error(text || `Error al habilitar la plantilla de documento (status ${res.status})`);
  }

  let json: ToggleDocumentTemplateApiResponse;
  try {
    json = (await res.json()) as ToggleDocumentTemplateApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de PATCH /document-template/:id/enable =>', err);
    throw new Error('Respuesta inválida del servicio de plantillas de documento');
  }

  if (json.status !== 'success') {
    console.error('Servicio PATCH /document-template/:id/enable respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de plantillas de documento');
  }

  return {
    message: json.data?.message ?? 'Plantilla de documento habilitada correctamente',
  };
};
