'use server';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

/* ---------------------------------------------
 *  Tipos compartidos (si ya los tienes, no los dupliques)
 * --------------------------------------------- */

export interface EventScheduleInput {
  start_datetime: string;
  end_datetime: string;
}

export interface EventParticipantInput {
  national_id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

/* ---------------------------------------------
 *  UPDATE EVENT
 * --------------------------------------------- */

export interface UpdateEventBody {
  title?: string;
  description?: string;
  document_type_id?: string;
  template_id?: string | null;
  location?: string;
  status?: string; // ej: "RESCHEDULED", "CANCELLED", etc.
  participants?: EventParticipantInput[];
  schedules?: EventScheduleInput[];
}

export interface UpdateEventApiData {
  id: string;
  name: string;
  message: string;
}

interface UpdateEventApiResponse {
  data: UpdateEventApiData;
  status: 'success' | 'failed';
  message: string;
}

export interface UpdateEventResult {
  id: string;
  name: string;
  message: string;
}

export type FnUpdateEvent = (eventId: string, body: UpdateEventBody) => Promise<UpdateEventResult>;

export const fn_update_event: FnUpdateEvent = async (eventId, body) => {
  if (!eventId) {
    throw new Error('El ID del evento es obligatorio');
  }

  const url = `${BASE_URL}/events/${encodeURIComponent(eventId)}`;

  const res = await fetch(url, {
    method: 'PATCH',
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

    console.error('Error al consumir PATCH /events/:id =>', {
      url,
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    throw new Error(text || `Error al actualizar el evento (status ${res.status})`);
  }

  let json: UpdateEventApiResponse;
  try {
    json = (await res.json()) as UpdateEventApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de PATCH /events/:id =>', err);
    throw new Error('Respuesta inválida del servicio de eventos');
  }

  if (json.status !== 'success') {
    console.error('Servicio PATCH /events/:id respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de eventos');
  }

  return {
    id: json.data.id,
    name: json.data.name,
    message: json.data.message,
  };
};
