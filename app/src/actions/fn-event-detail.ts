'use server';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

export interface EventDetailTemplate {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  document_type_id: string;
  document_type_code: string;
  document_type_name: string;
}

export interface EventDetailSchedule {
  id: string;
  start_datetime: string;
  end_datetime: string;
}

export type RegistrationSource = 'ADMIN' | 'IMPORTED' | 'SELF' | 'SELF_REGISTERED' | string;
export type RegistrationStatus = 'REGISTERED' | 'PENDING' | 'CANCELLED' | 'REJECTED' | string;
export type AttendanceStatus = 'PENDING' | 'ATTENDED' | 'ABSENT' | string;

export interface EventDetailParticipant {
  id: string;
  user_detail_id: string;
  national_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  registration_source: RegistrationSource;
  registration_status: RegistrationStatus;
  attendance_status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export interface EventDetail {
  id: string;
  is_public: boolean;
  code: string;
  certificate_series: string;
  organizational_units_path: string;
  title: string;
  description: string;
  location: string;
  max_participants: number | null;
  registration_open_at: string;
  registration_close_at: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  template: EventDetailTemplate | null;
  schedules: EventDetailSchedule[];
  participants: EventDetailParticipant[];
  documents: unknown | null;
}

interface EventDetailApiResponse {
  data: EventDetail;
  status: 'success' | 'failed';
  message: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EventDetailResult extends EventDetail {}

export type FnGetEventDetail = (eventId: string) => Promise<EventDetailResult>;

export const fn_get_event_detail: FnGetEventDetail = async (eventId) => {
  if (!eventId) throw new Error('El event_id es obligatorio');

  const url = `${BASE_URL}/event/${encodeURIComponent(eventId)}`;

  const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });

  if (!res.ok) {
    let text = '';
    try {
      text = await res.text();
    } catch {
      text = '';
    }

    console.error('Error al consumir GET /event/:id =>', { url, status: res.status, statusText: res.statusText, body: text });

    throw new Error(text || 'Error al obtener el detalle del evento');
  }

  let json: EventDetailApiResponse;
  try {
    json = (await res.json()) as EventDetailApiResponse;
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
