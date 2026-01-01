'use server';

import { auth } from '@/lib/auth';

const API_CUM_URL = process.env.API_CUM_URL ?? 'http://localhost:8080';

type SimpleModuleDTO = {
  id: string;
  name: string;
};

type ModuleDTO = {
  id: string;
  item?: string | null;
  name: string;
  route?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  sort_order: number;
  status: string;
  created_at: string;
  updated_at: string;
  parent?: SimpleModuleDTO | null;
  children?: SimpleModuleDTO[];
};

export interface UserRoleResponse {
  id: string;
  role: string;
  modules: ModuleDTO[];
}

export const fn_get_user_role = async (clientId?: string): Promise<UserRoleResponse> => {
  try {
    const session = await auth();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (session as any)?.accessToken as string | undefined;

    if (!accessToken) {
      throw new Error('No autenticado');
    }

    // Usar clientId proporcionado o el de la variable de entorno
    const appClientId = clientId || process.env.APP_CLIENT_ID || '';

    if (!appClientId) {
      throw new Error('Falta el client_id de la aplicación');
    }

    const res = await fetch(`${API_CUM_URL}/auth/role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        client_id: appClientId,
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Error al obtener rol: ${res.status}`);
    }

    const data = await res.json();

    console.log('Rol y módulos:', data);

    return {
      id: data.role_id,
      role: data.role_name,
      modules: data.modules ?? [],
    };
  } catch (err) {
    console.error('Error en fn_get_user_role:', err);
    throw err;
  }
};
