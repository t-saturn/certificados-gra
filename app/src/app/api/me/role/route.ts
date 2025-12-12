/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

type SimpleModuleDTO = { id: string; name: string };
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

type CumRoleResponse = {
  role_id: string;
  role_name: string;
  modules: ModuleDTO[];
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_CUM_URL = process.env.API_CUM_URL;

export async function GET(req: NextRequest) {
  try {
    if (!API_CUM_URL) {
      return NextResponse.json({ error: 'API_CUM_URL no está configurado en variables de entorno' }, { status: 500 });
    }

    // 1 sesión NextAuth (Keycloak)
    const session = await auth();
    const userId = session?.user?.id ? String(session.user.id) : null;
    const accessToken = (session as any)?.accessToken as string | undefined;

    if (!userId || !accessToken) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // 2 client_id desde query o env
    const { searchParams } = new URL(req.url);
    const clientIdFromQuery = searchParams.get('client_id');
    const clientId = clientIdFromQuery || process.env.NEXT_PUBLIC_APP_CLIENT_ID || '';

    if (!clientId) return NextResponse.json({ error: 'Falta el parámetro client_id' }, { status: 400 });

    // 3 llamada directa a CUM
    const res = await fetch(`${API_CUM_URL}/auth/role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Keycloak access token para que CUM valide autorización
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ user_id: userId, client_id: clientId }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json({ error: 'Fallo al obtener el rol desde CUM', detail: text || `status ${res.status}` }, { status: res.status });
    }

    const data = (await res.json()) as CumRoleResponse;

    const payload = { id: data.role_id, role: data.role_name, modules: data.modules ?? [] };

    return NextResponse.json(payload, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno del servidor', detail: String(err?.message || err) }, { status: 500 });
  }
}
