'use server';

import { auth } from '@/lib/auth';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

/* ---------------------------------------------
 *  TYPES
 * --------------------------------------------- */

export interface EventScheduleInput {
  start_datetime: string; // ISO
  end_datetime: string; // ISO
}

export interface EventParticipantInput {
  national_id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

export interface CreateEventBody {
  title: string;
  description?: string;
  document_type_id: string;
  location: string;

  // opcionales:
  template_id?: string;
  participants?: EventParticipantInput[];
  schedules: EventScheduleInput[];
}

export interface CreateEventApiData {
  id: string;
  name: string;
  message: string;
}

interface CreateEventApiResponse {
  data: CreateEventApiData;
  status: 'success' | 'failed';
  message: string;
}

export interface CreateEventResult {
  id: string;
  name: string;
  message: string;
}

/* ---------------------------------------------
 *  HELPERS
 * --------------------------------------------- */

export const getCurrentUserId = async (): Promise<string> => {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Sesión inválida');
  return session.user.id;
};

/* ---------------------------------------------
 *  SERVER ACTION
 * --------------------------------------------- */

export const fn_create_event = async (body: CreateEventBody): Promise<CreateEventResult> => {
  const userId = await getCurrentUserId();

  const url = `${BASE_URL}/events?user_id=${encodeURIComponent(userId)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let text = '';
    try {
      text = await res.text();
    } catch {
      text = '';
    }

    console.error('Error en POST /events =>', {
      status: res.status,
      text,
    });

    throw new Error(text || 'Error al registrar el evento');
  }

  let json: CreateEventApiResponse;
  try {
    json = (await res.json()) as CreateEventApiResponse;
  } catch (err) {
    console.error('Error parseando respuesta de /events =>', err);
    throw new Error('Respuesta inválida del servidor al registrar evento');
  }

  if (json.status !== 'success') {
    console.error('API /events devolvió failed =>', json);
    throw new Error(json.message || 'No se pudo registrar el evento');
  }

  return {
    id: json.data.id,
    name: json.data.name,
    message: json.data.message,
  };
};
