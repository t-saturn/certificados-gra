'use server';

import { auth } from '@/lib/auth';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

/* ---------- Helper para user_id ---------- */
export const getCurrentUserId = async (): Promise<string> => {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Sesión inválida: no se encontró el usuario autenticado');
  return session.user.id;
};

export type EventAction = 'generate_certificates' | 'sign_certificates' | 'rejected_certificates';

export interface EventActionResponse {
  event_id: string;
  action: EventAction;
  result: {
    created: number;
    skipped: number;
    updated: number;
  };
}

export interface EventActionBody {
  action: EventAction;
  participants_id?: string[]; // user_detail_id[]
}

/**
 * POST /event/:id
 * body: { action: "generate_certificates" | "sign_certificates" | "rejected_certificates", participants_id?: string[] }
 *
 * - participants_id vacío/undefined => aplica a todos los participantes del evento
 * - participants_id con ids => aplica solo a ese grupo
 */
export const fn_event_action = async (eventId: string, action: EventAction, participantsId?: string[]): Promise<EventActionResponse> => {
  if (!eventId?.trim()) throw new Error('eventId es requerido');

  const url = `${BASE_URL}/event/${encodeURIComponent(eventId)}`;

  const body: EventActionBody = { action };
  if (participantsId && participantsId.length > 0) {
    body.participants_id = participantsId;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const payload = (await res.json().catch(() => null)) as Record<string, unknown> | null;

  if (!res.ok) {
    const msg = payload?.message || payload?.error || `Error ${res.status} al ejecutar acción del evento`;
    throw new Error(String(msg));
  }

  // wrapper: { data, status, message }
  const data = payload?.data ?? payload;

  return data as EventActionResponse;
};
