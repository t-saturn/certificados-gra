'use server';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

export interface GetDocumentTypesParams {
  page?: number;
  page_size?: number;
  search_query?: string;
  is_active?: boolean;
}

export interface DocumentTypeCategory {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
}

export interface DocumentTypeItem {
  id: string; // uuid
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories: DocumentTypeCategory[];
}

export interface DocumentTypesPagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_prev_page: boolean;
  has_next_page: boolean;
}

export interface DocumentTypesFilters {
  is_active?: boolean;
  search_query?: string | null;
}

interface DocumentTypesApiResponse {
  data: {
    items: DocumentTypeItem[];
    pagination: DocumentTypesPagination;
    filters: DocumentTypesFilters;
  };
  status: 'success' | 'failed';
  message: string;
}

export interface DocumentTypesResult {
  items: DocumentTypeItem[];
  pagination: DocumentTypesPagination;
  filters: DocumentTypesFilters;
}

export type FnGetDocumentTypes = (params?: GetDocumentTypesParams) => Promise<DocumentTypesResult>;

export const fn_get_document_types: FnGetDocumentTypes = async (params = {}) => {
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

  if (params.is_active === undefined) {
    searchParams.set('is_active', 'true');
  } else {
    searchParams.set('is_active', String(params.is_active));
  }

  const queryString = searchParams.toString();
  const url = `${BASE_URL}/document-types${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Error al consumir GET /document-types =>', text);
    throw new Error('Error al obtener los tipos de documento');
  }

  const json = (await res.json()) as DocumentTypesApiResponse;

  if (json.status !== 'success') {
    console.error('Servicio /document-types respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de tipos de documento');
  }

  return {
    items: json.data.items,
    pagination: json.data.pagination,
    filters: json.data.filters,
  };
};
