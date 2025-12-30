'use server';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

/* ---------------------------------------------
 *  Tipos
 * --------------------------------------------- */

export type RegistrationSource = 'ADMIN' | 'IMPORTED' | 'SELF_REGISTERED' | string;

export type RegistrationStatus = 'REGISTERED' | 'PENDING' | 'CANCELLED' | 'REJECTED' | string;

export type AttendanceStatus = 'PENDING' | 'ATTENDED' | 'ABSENT' | string;

export interface EventParticipantItem {
  user_detail_id: string;
  national_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  registration_source: RegistrationSource;
  registration_status: RegistrationStatus;
  attendance_status: AttendanceStatus;
}

export interface EventParticipantsFilters {
  page: number;
  page_size: number;
  total: number;
  has_next_page: boolean;
  has_prev_page: boolean;
  search_query?: string;
}

export interface EventParticipantsResult {
  participants: EventParticipantItem[];
  filters: EventParticipantsFilters;
}

// lo que devuelve el backend
interface EventParticipantsApiResponse {
  data: {
    filters: EventParticipantsFilters;
    participants: EventParticipantItem[];
  };
  status: 'success' | 'failed';
  message: string;
}

export interface GetEventParticipantsParams {
  page?: number;
  page_size?: number;
  search_query?: string;
}

export type FnGetEventParticipants = (eventId: string, params?: GetEventParticipantsParams) => Promise<EventParticipantsResult>;

/* ---------------------------------------------
 *  Server action
 * --------------------------------------------- */

export const fn_get_event_participants: FnGetEventParticipants = async (eventId, params = {}) => {
  if (!eventId) {
    throw new Error('El ID del evento es obligatorio');
  }

  const searchParams = new URLSearchParams();

  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.page_size !== undefined) searchParams.set('page_size', String(params.page_size));
  if (params.search_query !== undefined) searchParams.set('search_query', params.search_query);

  const queryString = searchParams.toString();
  const url = `${BASE_URL}/events/${encodeURIComponent(eventId)}/participant/list${queryString ? `?${queryString}` : ''}`;

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

    console.error('Error al consumir GET /events/:eventId/participant/list =>', {
      url,
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    throw new Error(text || 'Error al obtener la lista de participantes');
  }

  let json: EventParticipantsApiResponse;
  try {
    json = (await res.json()) as EventParticipantsApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de /events/:eventId/participant/list =>', err);
    throw new Error('Respuesta inválida del servicio de participantes');
  }

  if (json.status !== 'success') {
    console.error('Servicio /events/:eventId/participant/list respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de participantes');
  }

  return {
    participants: json.data.participants,
    filters: json.data.filters,
  };
};
