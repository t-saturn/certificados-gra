'use client';

import type { FC, JSX } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { ExtendedSession } from '@/types/auth.types';

type SessionInfoItemProps = {
  label: string;
  value: string | undefined | null;
  isMono?: boolean;
};

const SessionInfoItem: FC<SessionInfoItemProps> = ({ label, value, isMono = false }): JSX.Element => (
  <div className="py-3 border-b border-border last:border-0">
    <dt className="text-sm text-muted-foreground mb-1">{label}</dt>
    <dd className={`text-sm text-foreground break-all ${isMono ? 'font-mono text-xs' : ''}`}>{value ?? 'No disponible'}</dd>
  </div>
);

type TokenDisplayProps = {
  title: string;
  token: string | undefined;
};

const TokenDisplay: FC<TokenDisplayProps> = ({ title, token }): JSX.Element => (
  <div className="rounded-lg bg-muted p-4">
    <h4 className="text-sm font-medium text-foreground mb-2">{title}</h4>
    <div className="max-h-24 overflow-auto">
      <code className="text-xs text-muted-foreground break-all">{token ? `${token.substring(0, 50)}...` : 'No disponible'}</code>
    </div>
  </div>
);

const DashboardPage: FC = (): JSX.Element => {
  const { data, status } = useSession();
  const session = data as ExtendedSession | null;
  const router = useRouter();

  const handleLogout = async (): Promise<void> => {
    try {
      const response = await fetch('/api/auth/keycloak-logout');
      const result = (await response.json()) as { url?: string };

      await signOut({ redirect: false });

      if (result.url) {
        window.location.href = result.url;
      } else {
        router.push('/');
      }
    } catch {
      await signOut({ callbackUrl: '/' });
    }
  };

  const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return 'No disponible';
    return new Date(timestamp * 1000).toLocaleString('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    });
  };

  const isSessionActive = (): boolean => {
    if (!session?.expiresAt) return false;
    return Date.now() < session.expiresAt * 1000;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image src="/img/logo.webp" alt="GRA" width={40} height={40} className="h-10 w-auto" />
              <span className="text-lg font-bold text-foreground hidden sm:block">Certificaciones</span>
            </Link>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-montserrat)' }}>
            Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">Información de tu sesión actual</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-card p-6 border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Estado de Sesión</h2>
              <div className="flex items-center gap-2">
                <span
                  className={`h-3 w-3 rounded-full ${status === 'authenticated' && isSessionActive() ? 'bg-chart-2 animate-pulse' : status === 'loading' ? 'bg-yellow-500 animate-pulse' : 'bg-destructive'}`}
                />
                <span className="text-sm font-medium text-foreground">{status === 'authenticated' && isSessionActive() ? 'Activa' : status === 'loading' ? 'Cargando...' : 'Inactiva'}</span>
              </div>
            </div>

            <dl>
              <SessionInfoItem label="Estado" value={status} />
              <SessionInfoItem label="Sesión activa" value={isSessionActive() ? 'Sí' : 'No'} />
              <SessionInfoItem label="Expira" value={formatDate(session?.expiresAt)} />
              <SessionInfoItem label="Error" value={session?.error ?? 'Ninguno'} />
            </dl>
          </div>

          <div className="rounded-xl bg-card p-6 border border-border">
            <h2 className="text-lg font-bold text-foreground mb-6">Información del Usuario</h2>
            <dl>
              <SessionInfoItem label="ID de Usuario" value={session?.user?.id} isMono />
              <SessionInfoItem label="Nombre completo" value={session?.user?.name} />
              <SessionInfoItem label="Email" value={session?.user?.email} />
              <SessionInfoItem label="Roles" value={session?.user?.roles?.length ? session.user.roles.join(', ') : 'Sin roles'} />
            </dl>
          </div>

          <div className="rounded-xl bg-card p-6 border border-border lg:col-span-2">
            <h2 className="text-lg font-bold text-foreground mb-6">Tokens</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <TokenDisplay title="Access Token" token={session?.accessToken} />
              <TokenDisplay title="ID Token" token={session?.idToken} />
              <TokenDisplay title="Refresh Token" token={session?.refreshToken} />
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 border border-border lg:col-span-2">
            <h2 className="text-lg font-bold text-foreground mb-6">Sesión Completa (JSON)</h2>
            <div className="rounded-lg bg-muted p-4 max-h-96 overflow-auto">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                {JSON.stringify(
                  {
                    status,
                    user: session?.user,
                    expiresAt: session?.expiresAt,
                    error: session?.error,
                    hasAccessToken: !!session?.accessToken,
                    hasIdToken: !!session?.idToken,
                    hasRefreshToken: !!session?.refreshToken,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
