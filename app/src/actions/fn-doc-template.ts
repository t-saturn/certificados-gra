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
  is_active?: boolean;
  template_type_code?: string;
  template_category_code?: string;
}

export interface DocumentTemplateItem {
  id: string;
  code: string;
  name: string;
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

  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.page_size !== undefined) searchParams.set('page_size', String(params.page_size));
  if (params.search_query) searchParams.set('search_query', params.search_query);
  if (params.template_type_code) searchParams.set('template_type_code', params.template_type_code);
  if (params.template_category_code) searchParams.set('template_category_code', params.template_category_code);

  searchParams.set('is_active', String(params.is_active ?? true));

  const url = `${BASE_URL}/document-templates?${searchParams.toString()}`;

  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) throw new Error(await res.text());

  const json = (await res.json()) as DocumentTemplatesApiResponse;

  if (json.status !== 'success') {
    throw new Error(json.message);
  }

  return json.data;
};

/* ---------- TIPOS: POST /document-template ---------- */

export interface DocumentTemplateFieldCreate {
  key: string;
  label: string;
  field_type: 'text' | 'date' | 'number' | 'boolean';
  required: boolean;
}

export interface CreateDocumentTemplateBody {
  doc_type_code: string;
  doc_category_code: string;
  code: string;
  name: string;
  file_id: string;
  prev_file_id?: string;
  is_active?: boolean;
  fields?: DocumentTemplateFieldCreate[];
}

interface CreateDocumentTemplateApiResponse {
  data: { message: string } | null;
  status: 'success' | 'failed';
  message: string;
}

export interface CreateDocumentTemplateResult {
  message: string;
}

export type FnCreateDocumentTemplate = (body: CreateDocumentTemplateBody) => Promise<CreateDocumentTemplateResult>;

export const fn_create_document_template: FnCreateDocumentTemplate = async (body) => {
  const userId = await getCurrentUserId();
  const url = `${BASE_URL}/document-template?user_id=${encodeURIComponent(userId)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const json = (await res.json()) as CreateDocumentTemplateApiResponse;

  if (json.status !== 'success') {
    throw new Error(json.message);
  }

  return {
    message: json.data?.message ?? 'Plantilla creada correctamente',
  };
};

/* ---------- UPDATE: PATCH /document-template/:id ---------- */

export interface UpdateDocumentTemplateBody {
  code?: string;
  name?: string;
  file_id?: string;
  prev_file_id?: string;
  is_active?: boolean;
  fields?: DocumentTemplateFieldCreate[];
}

interface UpdateDocumentTemplateApiResponse {
  data: { message: string } | null;
  status: 'success' | 'failed';
  message: string;
}

export interface UpdateDocumentTemplateResult {
  message: string;
}

export type FnUpdateDocumentTemplate = (id: string, body: UpdateDocumentTemplateBody) => Promise<UpdateDocumentTemplateResult>;

export const fn_update_document_template: FnUpdateDocumentTemplate = async (id, body) => {
  if (!id) throw new Error('ID requerido');

  const url = `${BASE_URL}/document-template/${encodeURIComponent(id)}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const json = (await res.json()) as UpdateDocumentTemplateApiResponse;

  if (json.status !== 'success') {
    throw new Error(json.message);
  }

  return {
    message: json.data?.message ?? 'Plantilla actualizada correctamente',
  };
};

/* ---------- DISABLE: PATCH /document-template/:id/disable ---------- */

interface ToggleApiResponse {
  data: { message: string } | null;
  status: 'success' | 'failed';
  message: string;
}

export const fn_disable_document_template = async (id: string) => {
  const url = `${BASE_URL}/document-template/${encodeURIComponent(id)}/disable`;
  const res = await fetch(url, { method: 'PATCH', cache: 'no-store' });

  if (!res.ok) throw new Error(await res.text());

  const json = (await res.json()) as ToggleApiResponse;
  if (json.status !== 'success') throw new Error(json.message);

  return { message: json.data?.message ?? 'Plantilla deshabilitada' };
};

export const fn_enable_document_template = async (id: string) => {
  const url = `${BASE_URL}/document-template/${encodeURIComponent(id)}/enable`;
  const res = await fetch(url, { method: 'PATCH', cache: 'no-store' });

  if (!res.ok) throw new Error(await res.text());

  const json = (await res.json()) as ToggleApiResponse;
  if (json.status !== 'success') throw new Error(json.message);

  return { message: json.data?.message ?? 'Plantilla habilitada' };
};
