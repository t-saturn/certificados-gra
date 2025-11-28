'use server';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

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
