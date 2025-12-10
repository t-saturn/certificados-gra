'use server';

import { auth } from '@/lib/auth';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

/* ---------------------------------------------
 *  Tipos
 * --------------------------------------------- */

export interface EventDetailDocumentType {
  id: string;
  code: string;
  name: string;
}

export interface EventDetailSchedule {
  start_datetime: string;
  end_datetime: string;
}

export type RegistrationSource = 'ADMIN' | 'IMPORTED' | 'SELF_REGISTERED' | string;

export type RegistrationStatus = 'REGISTERED' | 'PENDING' | 'CANCELLED' | 'REJECTED' | string;

export type AttendanceStatus = 'PENDING' | 'ATTENDED' | 'ABSENT' | string;

export interface EventDetailParticipant {
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

export interface EventDetail {
  id: string;
  title: string;
  description: string;
  document_type: EventDetailDocumentType;
  location: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  schedules: EventDetailSchedule[];
  participants: EventDetailParticipant[];
}

interface EventDetailApiResponse {
  data: EventDetail;
  status: 'success' | 'failed';
  message: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EventDetailResult extends EventDetail {}

/* ---------------------------------------------
 *  Helper para user_id
 * --------------------------------------------- */

const getCurrentUserId = async (): Promise<string> => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Sesión inválida');
  }
  return session.user.id;
};

/* ---------------------------------------------
 *  Server Action
 * --------------------------------------------- */

export type FnGetEventDetail = (eventId: string, options?: { send_user_id?: boolean }) => Promise<EventDetailResult>;

export const fn_get_event_detail: FnGetEventDetail = async (eventId, options = {}) => {
  if (!eventId) {
    throw new Error('El event_id es obligatorio');
  }

  const searchParams = new URLSearchParams();
  searchParams.set('event_id', eventId);

  if (options.send_user_id) {
    const userId = await getCurrentUserId();
    searchParams.set('user_id', userId);
  }

  const url = `${BASE_URL}/event-detail?${searchParams.toString()}`;

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

    console.error('Error al consumir GET /event-detail =>', {
      url,
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    throw new Error(text || 'Error al obtener el detalle del evento');
  }

  let json: EventDetailApiResponse;
  try {
    json = (await res.json()) as EventDetailApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de /event-detail =>', err);
    throw new Error('Respuesta inválida del servicio de eventos');
  }

  if (json.status !== 'success') {
    console.error('Servicio /event-detail respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de eventos');
  }

  return json.data;
};
