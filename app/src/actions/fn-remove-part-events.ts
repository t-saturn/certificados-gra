'use server';

import { auth } from '@/lib/auth';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

/* ---------------------------------------------
 *  Helper para user_id (si ya lo tienes, reutiliza)
 * --------------------------------------------- */
const getCurrentUserId = async (): Promise<string> => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Sesión inválida');
  }
  return session.user.id;
};

/* ---------------------------------------------
 *  REMOVE PARTICIPANT FROM EVENT
 * --------------------------------------------- */

export interface RemoveParticipantApiData {
  id: string; // event_id
  name: string; // event name
  message: string;
}

interface RemoveParticipantApiResponse {
  data: RemoveParticipantApiData;
  status: 'success' | 'failed';
  message: string;
}

export interface RemoveParticipantResult {
  id: string; // event_id
  name: string;
  message: string;
}

export type FnRemoveEventParticipant = (eventId: string, participantId: string) => Promise<RemoveParticipantResult>;

export const fn_remove_event_participant: FnRemoveEventParticipant = async (eventId, participantId) => {
  if (!eventId) {
    throw new Error('El ID del evento es obligatorio');
  }
  if (!participantId) {
    throw new Error('El ID del participante es obligatorio');
  }

  const userId = await getCurrentUserId();

  const url = `${BASE_URL}/events/${encodeURIComponent(eventId)}/participants/remove/${encodeURIComponent(participantId)}?user_id=${encodeURIComponent(userId)}`;

  const res = await fetch(url, {
    method: 'PATCH',
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

    console.error('Error al consumir PATCH /events/:eventId/participants/remove/:participantId =>', {
      url,
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    throw new Error(text || `Error al remover participante (status ${res.status})`);
  }

  let json: RemoveParticipantApiResponse;
  try {
    json = (await res.json()) as RemoveParticipantApiResponse;
  } catch (err) {
    console.error('Error parseando JSON de PATCH /events/:eventId/participants/remove/:participantId =>', err);
    throw new Error('Respuesta inválida del servicio de eventos');
  }

  if (json.status !== 'success') {
    console.error('Servicio PATCH /events/:eventId/participants/remove/:participantId respondió failed =>', json);
    throw new Error(json.message || 'Error en el servicio de eventos');
  }

  return {
    id: json.data.id,
    name: json.data.name,
    message: json.data.message,
  };
};
