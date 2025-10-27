'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleProvider, type RoleValue } from '@/providers/role';
import { to_cb64 } from '@/helpers';

const AUTH_ORIGIN = process.env.NEXT_PUBLIC_AUTH_ORIGIN!;
const APP_CLIENT_ID = process.env.NEXT_PUBLIC_APP_CLIENT_ID!;
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN!;

const RoleGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [role, setRole] = useState<RoleValue | null | 'loading'>('loading');

  useEffect(() => {
    let stop = false;

    const fetchRole = async () => {
      try {
        if (!AUTH_ORIGIN || !APP_CLIENT_ID) {
          console.warn('Faltan envs NEXT_PUBLIC_AUTH_ORIGIN o NEXT_PUBLIC_APP_CLIENT_ID');
          setRole(null);
          return;
        }

        const url = `${AUTH_ORIGIN}/api/me/role?client_id=${encodeURIComponent(APP_CLIENT_ID)}`;

        const res = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          mode: 'cors',
          cache: 'no-store',
          headers: {
            // opcional: hint de origen (no necesario si CORS ya valida Origin)
            // 'X-App-Origin': APP_ORIGIN,
          },
        });

        if (res.status === 401) {
          const here = typeof window !== 'undefined' ? window.location.href : `${APP_ORIGIN}/`;
          const cb64 = to_cb64(here);
          router.replace(`${AUTH_ORIGIN}/auth/signin?cb64=${cb64}`);
          return;
        }

        if (!res.ok) throw new Error('role fetch failed');

        const data = (await res.json()) as { id: string; role?: string; modules?: string[] };
        console.log('role data', data);
        if (!stop) setRole(data?.role ? { id: data.id, name: data.role, modules: data.modules || [] } : null);
      } catch {
        if (!stop) setRole(null);
      }
    };

    fetchRole();

    // Si quisieras ver cambios de rol en vivo, re-activa este intervalo:
    // const id = setInterval(fetchRole, 10000);

    return () => {
      stop = true;
      // clearInterval(id);
    };
  }, [router]);

  useEffect(() => {
    if (role === null) router.replace('/unauthorized');
  }, [role, router]);

  if (role === 'loading') return null;
  if (role === null) return null;

  return <RoleProvider value={role}>{children}</RoleProvider>;
};

export default RoleGuard;
