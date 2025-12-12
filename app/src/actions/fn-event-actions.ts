'use server';

import { auth } from '@/lib/auth';

const BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8002';

/* ---------- Helper para user_id ---------- */
export const getCurrentUserId = async (): Promise<string> => {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Sesión inválida: no se encontró el usuario autenticado');
  return session.user.id;
};

export type EventAction = 'create_certificates' | 'generate_certificates';

export interface EventActionResponse {
  event_id: string;
  action: EventAction;
  result: {
    created: number;
    skipped: number;
    updated: number;
  };
}

/**
 * POST /event/:id
 * body: { action: "create_certificates" | "generate_certificates" }
 */
export const fn_event_action = async (eventId: string, action: EventAction): Promise<EventActionResponse> => {
  if (!eventId?.trim()) throw new Error('eventId es requerido');

  const url = `${BASE_URL}/event/${encodeURIComponent(eventId)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Si tu backend usa auth por cookie, no necesitas Authorization.
      // Si usa bearer token, aquí deberías incluirlo.
    },
    body: JSON.stringify({ action }),
    cache: 'no-store',
  });

  const payload = (await res.json().catch(() => null)) as any;

  if (!res.ok) {
    const msg = payload?.message || payload?.error || `Error ${res.status} al ejecutar acción del evento`;
    throw new Error(msg);
  }

  // Tu wrapper suele devolver { data, status, message }
  const data = payload?.data ?? payload;

  return data as EventActionResponse;
};
