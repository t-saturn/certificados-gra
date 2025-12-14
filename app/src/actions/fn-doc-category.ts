/* eslint-disable no-console */
'use server';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

/* ---------- TIPOS ---------- */

export interface GetDocumentCategoriesParams {
  page?: number;
  page_size?: number;
  search_query?: string;
  is_active?: boolean; // si viene undefined, mandamos true por defecto
  doc_type_code?: string;
  doc_type_name?: string;
}

export interface DocumentCategoryItem {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentCategoriesPagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_prev_page: boolean;
  has_next_page: boolean;
}

export interface DocumentCategoriesFilters {
  search_query?: string | null;
  is_active?: boolean;
  doc_type_code?: string | null;
  doc_type_name?: string | null;
}

interface DocumentCategoriesApiResponse {
  data: {
    items: DocumentCategoryItem[];
    pagination: DocumentCategoriesPagination;
    filters: DocumentCategoriesFilters;
  };
  status: 'success' | 'failed';
  message: string;
}

export interface DocumentCategoriesResult {
  items: DocumentCategoryItem[];
  pagination: DocumentCategoriesPagination;
  filters: DocumentCategoriesFilters;
}

// eslint-disable-next-line no-unused-vars
export type FnGetDocumentCategories = (params?: GetDocumentCategoriesParams) => Promise<DocumentCategoriesResult>;

/* ---------- SERVER ACTION ---------- */

export const fn_get_document_categories: FnGetDocumentCategories = async (params = {}) => {
  const searchParams = new URLSearchParams();

  // Todos opcionales
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.page_size !== undefined) searchParams.set('page_size', String(params.page_size));
  if (params.search_query) searchParams.set('search_query', params.search_query);
  if (params.doc_type_code) searchParams.set('doc_type_code', params.doc_type_code);
  if (params.doc_type_name) searchParams.set('doc_type_name', params.doc_type_name);

  // is_active: por defecto true si no viene nada
  searchParams.set('is_active', String(params.is_active ?? true));

  const queryString = searchParams.toString();
  const url = `${BASE_URL}/document-categories${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    let text = '';
    try {
      text = await res.text();
    } catch {
      text = '';
    }

    console.error('Error al consumir GET /document-categories =>', {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    throw new Error(text || 'Error al obtener las categorías de documento');
  }

  let json: DocumentCategoriesApiResponse;
  try {
    json = (await res.json()) as DocumentCategoriesApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de /document-categories =>', err);
    throw new Error('Respuesta inválida del servicio de categorías de documento');
  }

  if (json.status !== 'success') {
    console.error('Servicio /document-categories respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de categorías de documento');
  }

  return {
    items: json.data.items,
    pagination: json.data.pagination,
    filters: json.data.filters,
  };
};
