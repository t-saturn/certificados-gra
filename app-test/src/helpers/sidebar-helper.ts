export const to_cb64 = (s: string) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

export const from_cb64 = (b64url: string): string => {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4);
  try {
    return Buffer.from(padded, 'base64').toString('utf8');
  } catch {
    return '/home';
  }
};

export const isAllowed = (urlStr: string) => {
  try {
    const u = new URL(urlStr);
    const allowed = new Set([process.env.NEXT_PUBLIC_AUTH_ORIGIN, process.env.NEXT_PUBLIC_APP_ORIGIN].filter(Boolean) as string[]);
    return allowed.has(u.origin) || u.hostname.endsWith('localtest.me');
  } catch {
    return false;
  }
};
