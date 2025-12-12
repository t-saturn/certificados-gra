/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const issuer = process.env.KEYCLOAK_ISSUER;
  const clientId = process.env.KEYCLOAK_CLIENT_ID;
  const baseUrl = process.env.NEXTAUTH_URL;

  if (!issuer || !clientId || !baseUrl) return NextResponse.json({ error: 'Faltan envs KEYCLOAK_ISSUER, KEYCLOAK_CLIENT_ID o NEXTAUTH_URL' }, { status: 500 });

  const session = await auth();
  const idToken = (session as any)?.idToken as string | undefined;

  const kcLogout = new URL(`${issuer}/protocol/openid-connect/logout`);
  if (idToken) kcLogout.searchParams.set('id_token_hint', idToken);

  kcLogout.searchParams.set('client_id', clientId);
  kcLogout.searchParams.set('post_logout_redirect_uri', baseUrl);

  return NextResponse.json({ url: kcLogout.toString() });
}
