'use server';

import { auth } from '@/lib/auth';
import type { ExtendedSession } from '@/types/auth.types';
import type { UserRoleResponse } from '@/types/role.types';

const API_CUM_URL = process.env.API_CUM_URL ?? 'https://api-cum.regionayacucho.gob.pe';
const APP_CLIENT_ID = process.env.NEXT_PUBLIC_APP_CLIENT_ID ?? 'cert-app';

export const fn_get_user_role = async (): Promise<UserRoleResponse> => {
  const session = (await auth()) as ExtendedSession | null;

  if (!session?.accessToken) {
    throw new Error('No autenticado');
  }

  if (!APP_CLIENT_ID) {
    throw new Error('Falta el client_id de la aplicación');
  }

  const response = await fetch(`${API_CUM_URL}/auth/role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({
      client_id: APP_CLIENT_ID,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');

    if (response.status === 404) {
      throw new Error('Usuario no tiene rol asignado para esta aplicación');
    }

    throw new Error(text || `Error al obtener rol: ${response.status}`);
  }

  const data: UserRoleResponse = await response.json();

  return data;
};
