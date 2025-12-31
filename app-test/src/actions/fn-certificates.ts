'use server';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

/* =========================
 * CERTIFICATES - LIST
 * ========================= */

export type CertificateStatus = 'all' | 'CREATED' | 'GENERATED' | 'REJECTED';

export interface CertificateListQuery {
  search_query?: string; // participante: dni/nombre/apellido
  event_query?: string; // evento: title/code
  status?: CertificateStatus; // CREATED | GENERATED | REJECTED | all
  event_id?: string;
  user_id?: string;
  national_id?: string; // DNI exacto
  page?: number;
  page_size?: number;
}

export interface CertificateParticipant {
  id: string;
  national_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

export interface CertificateEventSummary {
  id?: string;
  code?: string;
  title?: string;
}

export interface CertificatePDFItem {
  id: string;
  stage: string;
  version: number;
  file_id: string;
  file_name: string;
  file_hash: string;
}

export interface CertificateListItem {
  id: string;
  serial_code: string;
  verification_code: string;
  status: Exclude<CertificateStatus, 'all'>; // CREATED | GENERATED | REJECTED
  state_label: string; // PENDIENTE | LISTO | RECHAZADO
  issue_date: string;
  signed_at?: string | null;

  event: CertificateEventSummary;
  participant: CertificateParticipant;

  pdfs: CertificatePDFItem[];
  preview_file_id?: string | null;
}

export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_prev_page: boolean;
  has_next_page: boolean;
}

export interface CertificateListFilters {
  search_query: string;
  event_query: string;
  status: CertificateStatus;
  event_id?: string | null;
  user_id?: string | null;
  national_id?: string | null;
}

export interface CertificateListResponse {
  items: CertificateListItem[];
  pagination: Pagination;
  filters: CertificateListFilters;
}

/**
 * GET /certificates
 */
export const fn_list_certificates = async (query: CertificateListQuery = {}): Promise<CertificateListResponse> => {
  const params = new URLSearchParams();

  if (query.search_query?.trim()) params.set('search_query', query.search_query.trim());
  if (query.event_query?.trim()) params.set('event_query', query.event_query.trim());
  if (query.status?.trim()) params.set('status', query.status.trim());
  if (query.event_id?.trim()) params.set('event_id', query.event_id.trim());
  if (query.user_id?.trim()) params.set('user_id', query.user_id.trim());
  if (query.national_id?.trim()) params.set('national_id', query.national_id.trim());

  params.set('page', String(query.page ?? 1));
  params.set('page_size', String(query.page_size ?? 10));

  const url = `${BASE_URL}/certificates?${params.toString()}`;

  const res = await fetch(url, { method: 'GET', cache: 'no-store' });

  const payload: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      typeof payload === 'object' && payload && 'message' in payload && typeof (payload as { message: unknown }).message === 'string'
        ? (payload as { message: string }).message
        : typeof payload === 'object' && payload && 'error' in payload && typeof (payload as { error: unknown }).error === 'string'
          ? (payload as { error: string }).error
          : `Error ${res.status} al listar certificados`;
    throw new Error(msg);
  }

  // wrapper: { data, status, message }  o respuesta directa
  const data = unwrapData<CertificateListResponse>(payload);
  return data;
};

/* =========================
 * CERTIFICATES - DETAIL
 * ========================= */

export interface CertificateDetail {
  id: string;
  user_detail_id: string;
  event_id?: string | null;
  template_id?: string | null;

  serial_code: string;
  verification_code: string;
  hash_value: string;
  qr_text?: string | null;

  issue_date: string;
  signed_at?: string | null;
  digital_signature_status: string; // si luego lo eliminas del backend, ajusta aquí
  status: Exclude<CertificateStatus, 'all'>; // CREATED | GENERATED | REJECTED

  created_by: string;
  created_at: string;
  updated_at: string;

  user_detail?: {
    id: string;
    national_id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    email?: string | null;
  };

  event?: {
    id: string;
    code: string;
    title: string;
    is_public: boolean;
    certificate_series: string;
    organizational_units_path: string;
    location: string;
    status: string;
    registration_open_at?: string | null;
    registration_close_at?: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
  } | null;

  template?: {
    id: string;
    code: string;
    name: string;
    document_type_id: string;
    category_id?: number | null;
    file_id: string;
    prev_file_id: string;
    is_active: boolean;
    created_by?: string | null;
    created_at: string;
    updated_at: string;
    document_type?: {
      id: string;
      code: string;
      name: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
  } | null;

  pdfs?: Array<{
    id: string;
    document_id: string;
    stage: string;
    version: number;
    file_name: string;
    file_id: string;
    file_hash: string;
    file_size_bytes?: number | null;
    storage_provider?: string | null;
    created_at: string;
  }>;

  created_by_user?: {
    id: string;
    email: string;
    national_id: string;
    created_at: string;
    updated_at: string;
  };
}

export interface CertificateDetailResponse {
  certificate: CertificateDetail;
}

/**
 * GET /certificates/:id
 */
export const fn_get_certificate_by_id = async (certificateId: string): Promise<CertificateDetailResponse> => {
  if (!certificateId?.trim()) throw new Error('certificateId es requerido');

  const url = `${BASE_URL}/certificates/${encodeURIComponent(certificateId)}`;

  const res = await fetch(url, { method: 'GET', cache: 'no-store' });
  const payload: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      typeof payload === 'object' && payload && 'message' in payload && typeof (payload as { message: unknown }).message === 'string'
        ? (payload as { message: string }).message
        : typeof payload === 'object' && payload && 'error' in payload && typeof (payload as { error: unknown }).error === 'string'
          ? (payload as { error: string }).error
          : `Error ${res.status} al obtener certificado`;
    throw new Error(msg);
  }

  const data = unwrapData<CertificateDetailResponse>(payload);
  return data;
};

/* =========================
 * Helpers (sin any)
 * ========================= */

function unwrapData<T>(payload: unknown): T {
  // caso 1: { data: ... }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const p = payload as { data: unknown };
    return p.data as T;
  }
  // caso 2: respuesta directa
  return payload as T;
}
