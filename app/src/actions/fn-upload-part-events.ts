'use server';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

/* ---------------------------------------------
 *  Tipos para participantes (si ya tienes algo parecido, puedes reutilizar)
 * --------------------------------------------- */

export type RegistrationSource = 'ADMIN' | 'IMPORTED' | 'SELF_REGISTERED' | string;

export interface EventParticipantUploadInput {
  national_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  registration_source?: RegistrationSource;
}

/* ---------------------------------------------
 *  UPDATE PARTICIPANTS (UPLOAD)
 * --------------------------------------------- */

export interface UploadParticipantsBody {
  participants: EventParticipantUploadInput[];
}

export interface UploadParticipantsApiData {
  id: string;
  name: string;
  message: string;
  count: number;
}

interface UploadParticipantsApiResponse {
  data: UploadParticipantsApiData;
  status: 'success' | 'failed';
  message: string;
}

export interface UploadParticipantsResult {
  id: string;
  name: string;
  message: string;
  count: number;
}

export type FnUploadEventParticipants = (eventId: string, body: UploadParticipantsBody) => Promise<UploadParticipantsResult>;

export const fn_upload_event_participants: FnUploadEventParticipants = async (eventId, body) => {
  if (!eventId) {
    throw new Error('El ID del evento es obligatorio');
  }

  const url = `${BASE_URL}/events/${encodeURIComponent(eventId)}/participants/upload`;

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

    console.error('Error al consumir PATCH /events/:id/participants/upload =>', {
      url,
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    throw new Error(text || `Error al registrar participantes (status ${res.status})`);
  }

  let json: UploadParticipantsApiResponse;
  try {
    json = (await res.json()) as UploadParticipantsApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de PATCH /events/:id/participants/upload =>', err);
    throw new Error('Respuesta inválida del servicio de eventos al registrar participantes');
  }

  if (json.status !== 'success') {
    console.error('Servicio PATCH /events/:id/participants/upload respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de registro de participantes');
  }

  return {
    id: json.data.id,
    name: json.data.name,
    message: json.data.message,
    count: json.data.count,
  };
};
