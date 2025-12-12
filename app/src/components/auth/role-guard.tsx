'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleProvider, type RoleValue } from '@/providers/role';
import { toast } from 'sonner';

const APP_CLIENT_ID = process.env.NEXT_PUBLIC_APP_CLIENT_ID!;

const RoleGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [role, setRole] = useState<RoleValue | null | 'loading'>('loading');

  useEffect(() => {
    let stop = false;

    const fetchRole = async () => {
      try {
        if (!APP_CLIENT_ID) {
          toast.error('Falta env NEXT_PUBLIC_APP_CLIENT_ID');
          if (!stop) setRole(null);
          return;
        }

        const res = await fetch(`/api/me/role?client_id=${encodeURIComponent(APP_CLIENT_ID)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (res.status === 401) {
          // SessionGuard ya se encarga de mandar a login,
          // acá solo dejamos nulo para no renderizar protegido.
          if (!stop) setRole(null);
          return;
        }

        if (!res.ok) throw new Error('role fetch failed');

        const data = (await res.json()) as { id: string; role?: string; modules?: string[] };

        if (!stop) setRole(data?.role ? { id: data.id, name: data.role, modules: data.modules || [] } : null);
      } catch {
        if (!stop) setRole(null);
      }
    };

    fetchRole();
    return () => {
      stop = true;
    };
  }, [router]);

  useEffect(() => {
    if (role === null) router.replace('/main');
  }, [role, router]);

  if (role === 'loading') return null;
  if (role === null) return null;

  return <RoleProvider value={role}>{children}</RoleProvider>;
};

export default RoleGuard;
