import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { ExtendedSession } from '@/types/auth.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type KeycloakLogoutResponse = {
  url: string;
};

type KeycloakLogoutErrorResponse = {
  error: string;
};

export const GET = async (): Promise<NextResponse<KeycloakLogoutResponse | KeycloakLogoutErrorResponse>> => {
  const issuer = process.env.KEYCLOAK_ISSUER;
  const clientId = process.env.KEYCLOAK_CLIENT_ID;
  const baseUrl = process.env.NEXTAUTH_URL;

  if (!issuer || !clientId || !baseUrl) {
    return NextResponse.json({ error: 'Faltan variables de entorno: KEYCLOAK_ISSUER, KEYCLOAK_CLIENT_ID o NEXTAUTH_URL' }, { status: 500 });
  }

  const session = (await auth()) as ExtendedSession | null;
  const idToken = session?.idToken;

  const kcLogout = new URL(`${issuer}/protocol/openid-connect/logout`);

  if (idToken) {
    kcLogout.searchParams.set('id_token_hint', idToken);
  }

  kcLogout.searchParams.set('client_id', clientId);
  kcLogout.searchParams.set('post_logout_redirect_uri', baseUrl);

  return NextResponse.json({ url: kcLogout.toString() });
};
