'use server';

import { auth } from '@/lib/auth';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

/* ---------- Helper para user_id ---------- */

export const getCurrentUserId = async (): Promise<string> => {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Sesión inválida: no se encontró el usuario autenticado');

  return session.user.id;
};

/*  TIPOS COMUNES */

export interface EventTemplateSummary {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  document_type_id: string;
  document_type_code: string;
  document_type_name: string;
}

export interface EventSchedule {
  id?: string;
  start_datetime: string; // ISO string
  end_datetime: string; // ISO string
}

export interface EventParticipant {
  national_id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  registration_source: string; // "SELF" | "ADMIN" | etc.
}

/* GET /event/:id  (detalle evento) */

export interface EventDetail {
  id: string;
  is_public: boolean;
  code: string;
  certificate_series: string;
  organizational_units_path: string;
  title: string;
  description?: string | null;
  location?: string | null;
  max_participants?: number | null;
  registration_open_at: string;
  registration_close_at: string;
  status: string; // "SCHEDULED", etc.
  created_by: string;
  created_at: string;
  updated_at: string;
  template: EventTemplateSummary | null;
  schedules: EventSchedule[];
  participants: EventParticipant[] | null;
  documents: unknown | null;
}

interface GetEventByIdApiResponse {
  data: EventDetail;
  status: 'success' | 'failed';
  message: string;
}

export type FnGetEventById = (id: string) => Promise<EventDetail>;

export const fn_get_event_by_id: FnGetEventById = async (id) => {
  if (!id) {
    throw new Error('El id del evento es obligatorio');
  }

  const url = `${BASE_URL}/event/${encodeURIComponent(id)}`;
  console.log('[fn_get_event_by_id] URL =>', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('Error al consumir GET /event/:id =>', {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });
    throw new Error(text || `Error al obtener el evento (status ${res.status})`);
  }

  let json: GetEventByIdApiResponse;
  try {
    json = (await res.json()) as GetEventByIdApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de GET /event/:id =>', err);
    throw new Error('Respuesta inválida del servicio de eventos');
  }

  if (json.status !== 'success') {
    console.error('Servicio GET /event/:id respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de eventos');
  }

  return json.data;
};

/* GET /events  (listado eventos) */

export interface GetEventsParams {
  page?: number;
  page_size?: number;
  search_query?: string;
  is_public?: boolean;
  status?: string; // "SCHEDULED", etc.
  user_id?: string;
  date_from?: string; // "YYYY-MM-DD"
  date_to?: string; // "YYYY-MM-DD"
}

export interface EventListItem {
  id: string;
  code: string;
  title: string;
  status: string;
  is_public: boolean;
  certificate_series: string;
  organizational_units_path: string;
  location?: string | null;
  max_participants?: number | null;
  registration_open_at: string;
  registration_close_at: string;
  created_at: string;
  updated_at: string;
  template_id: string;
  template_code: string;
  template_name: string;
  document_type_id: string;
  document_type_code: string;
  document_type_name: string;
}

export interface EventsPagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_prev_page: boolean;
  has_next_page: boolean;
}

export interface EventsFilters {
  search_query?: string | null;
  status?: string | null;
  is_template_active?: boolean;
  is_public?: boolean;
  user_id?: string | null;
  date_from?: string | null;
  date_to?: string | null;
}

interface GetEventsApiResponse {
  data: {
    items: EventListItem[];
    pagination: EventsPagination;
    filters: EventsFilters;
  };
  status: 'success' | 'failed';
  message: string;
}

export interface EventsResult {
  items: EventListItem[];
  pagination: EventsPagination;
  filters: EventsFilters;
}

export type FnGetEvents = (params?: GetEventsParams) => Promise<EventsResult>;

export const fn_get_events: FnGetEvents = async (params = {}) => {
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
  if (params.status) {
    searchParams.set('status', params.status);
  }

  // is_public: si no viene, mandamos true por defecto
  if (params.is_public === undefined) {
    searchParams.set('is_public', 'true');
  } else {
    searchParams.set('is_public', String(params.is_public));
  }

  if (params.user_id) {
    searchParams.set('user_id', params.user_id);
  }
  if (params.date_from) {
    searchParams.set('date_from', params.date_from);
  }
  if (params.date_to) {
    searchParams.set('date_to', params.date_to);
  }

  const queryString = searchParams.toString();
  const url = `${BASE_URL}/events${queryString ? `?${queryString}` : ''}`;

  console.log('[fn_get_events] URL =>', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('Error al consumir GET /events =>', {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });
    throw new Error(text || `Error al obtener los eventos (status ${res.status})`);
  }

  let json: GetEventsApiResponse;
  try {
    json = (await res.json()) as GetEventsApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de GET /events =>', err);
    throw new Error('Respuesta inválida del servicio de eventos');
  }

  if (json.status !== 'success') {
    console.error('Servicio GET /events respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de eventos');
  }

  return {
    items: json.data.items,
    pagination: json.data.pagination,
    filters: json.data.filters,
  };
};

/* POST /event  (crear evento) */

export interface CreateEventScheduleBody {
  start_datetime: string;
  end_datetime: string;
}

export interface CreateEventParticipantBody {
  national_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  registration_source: string;
}

export interface CreateEventBody {
  is_public: boolean;
  code: string;
  certificate_series: string;
  organizational_units_path: string;
  title: string;
  description?: string;
  template_id: string;
  location?: string;
  max_participants?: number;
  registration_open_at: string;
  registration_close_at: string;
  status: string; // "SCHEDULED", etc.
  schedules: CreateEventScheduleBody[];
  participants?: CreateEventParticipantBody[];
}

interface CreateEventApiResponse {
  data: {
    message: string; // "Event created successfully"
  } | null;
  status: 'success' | 'failed';
  message: string;
}

export interface CreateEventResult {
  message: string;
}

export type FnCreateEvent = (body: CreateEventBody) => Promise<CreateEventResult>;

export const fn_create_event: FnCreateEvent = async (body) => {
  const userId = await getCurrentUserId();

  const url = `${BASE_URL}/event?user_id=${encodeURIComponent(userId)}`;

  console.log('[fn_create_event] URL =>', url);
  console.log('[fn_create_event] Body =>', body);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('Error al consumir POST /event =>', {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });
    throw new Error(text || `Error al crear el evento (status ${res.status})`);
  }

  let json: CreateEventApiResponse;
  try {
    json = (await res.json()) as CreateEventApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de POST /event =>', err);
    throw new Error('Respuesta inválida del servicio de eventos');
  }

  if (json.status !== 'success') {
    console.error('Servicio POST /event respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de eventos');
  }

  return { message: json.data?.message ?? 'Event created successfully' };
};
