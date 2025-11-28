'use server';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

// ---- Tipos ----
export interface EventSchedule {
  start_datetime: string; // ISO
  end_datetime: string; // ISO
}

export type EventStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED' | 'DRAFT' | string;

export interface EventItem {
  id: string;
  name: string;
  category_name?: string | null;
  document_type_name: string;
  participants_count: number;
  status: EventStatus;
  schedules: EventSchedule[];
}

export interface EventsFilters {
  page: number;
  page_size: number;
  total: number;
  has_next_page: boolean;
  has_prev_page: boolean;
  search_query: string;
  status: string;
}

export interface EventsResult {
  events: EventItem[];
  filters: EventsFilters;
}

// lo que devuelve el backend
interface EventsApiResponse {
  data: {
    events: EventItem[];
    filters: EventsFilters;
  };
  status: 'success' | 'failed';
  message: string;
}

export interface GetEventsParams {
  page?: number;
  page_size?: number;
  search_query?: string;
  status?: string; // ej: "scheduled", "all"
}

export type FnGetEvents = (params?: GetEventsParams) => Promise<EventsResult>;

// ---- Server Action ----
export const fn_get_events: FnGetEvents = async (params = {}) => {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.page_size !== undefined) searchParams.set('page_size', String(params.page_size));
  if (params.search_query !== undefined) searchParams.set('search_query', params.search_query);
  if (params.status !== undefined) searchParams.set('status', params.status);

  const queryString = searchParams.toString();
  const url = `${BASE_URL}/events${queryString ? `?${queryString}` : ''}`;

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

    console.error('Error al consumir GET /events =>', {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    throw new Error(text || 'Error al obtener los eventos');
  }

  let json: EventsApiResponse;
  try {
    json = (await res.json()) as EventsApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de /events =>', err);
    throw new Error('Respuesta inválida del servicio de eventos');
  }

  if (json.status !== 'success') {
    console.error('Servicio /events respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de eventos');
  }

  return {
    events: json.data.events,
    filters: json.data.filters,
  };
};
