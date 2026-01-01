import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { ExtendedSession } from '@/types/auth.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ValidateSessionResponse = {
  valid: boolean;
  reason?: string;
};

export const GET = async (): Promise<NextResponse<ValidateSessionResponse>> => {
  try {
    const session = (await auth()) as ExtendedSession | null;

    if (!session?.accessToken) return NextResponse.json({ valid: false, reason: 'no_session' });

    const response = await fetch(`${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
    });

    if (!response.ok) return NextResponse.json({ valid: false, reason: 'token_invalid' });

    return NextResponse.json({ valid: true });
  } catch {
    // console.error('Session validation error:', error);
    return NextResponse.json({ valid: false, reason: 'error' });
  }
};
