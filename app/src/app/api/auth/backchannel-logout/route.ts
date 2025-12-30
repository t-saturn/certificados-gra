import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LogoutTokenPayload = {
  sid?: string;
  sub?: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  events?: Record<string, unknown>;
};

const parseJwt = (token: string): LogoutTokenPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const contentType = request.headers.get('content-type') || '';

    let logoutToken: string | null = null;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      logoutToken = formData.get('logout_token') as string;
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      logoutToken = body.logout_token;
    }

    if (!logoutToken) return NextResponse.json({ error: 'logout_token not provided' }, { status: 400 });

    const payload = parseJwt(logoutToken);

    if (!payload) return NextResponse.json({ error: 'Invalid logout_token' }, { status: 400 });

    // console.log('Back-channel logout received:', { sid: payload.sid, sub: payload.sub, iss: payload.iss });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    // console.error('Back-channel logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
