export async function GET(req: Request) {
  const sso = process.env.NEXT_PUBLIC_AUTH_ORIGIN!;
  const upstream = new URL('/api/auth/session', sso);
  const cookie = req.headers.get('cookie') ?? '';
  const res = await fetch(upstream, { headers: { cookie }, credentials: 'include' });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}
