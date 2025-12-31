'use client';

import type { FC, JSX } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { keycloakSignOut } from '@/lib/keycloak-logout';
import { useRole } from '@/components/providers/role-provider';
import type { ExtendedSession } from '@/types/auth.types';

type InfoItemProps = {
  label: string;
  value: string | undefined | null;
  isMono?: boolean;
};

const InfoItem: FC<InfoItemProps> = ({ label, value, isMono = false }): JSX.Element => (
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

const MainPage: FC = (): JSX.Element => {
  const { data, status } = useSession();
  const session = data as ExtendedSession | null;
  const { roleId, roleName, modules, allowedRoutes } = useRole();

  const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return 'No disponible';
    return new Date(timestamp * 1000).toLocaleString('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    });
  };

  const isSessionActive = (): boolean => {
    if (!session?.expiresAt) return false;
    // eslint-disable-next-line react-hooks/purity
    return Date.now() < session.expiresAt * 1000;
  };

  const getSessionStatus = (): { label: string; color: string } => {
    if (status === 'loading') {
      return { label: 'Cargando...', color: 'bg-yellow-500' };
    }
    if (status === 'authenticated' && isSessionActive()) {
      return { label: 'Activa', color: 'bg-chart-2' };
    }
    return { label: 'Inactiva', color: 'bg-destructive' };
  };

  const sessionStatus = getSessionStatus();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/main" className="flex items-center gap-3">
              <Image src="/img/logo.webp" alt="GRA" width={40} height={40} className="h-10 w-auto" />
              <span className="text-lg font-bold text-foreground hidden sm:block">Certificaciones</span>
            </Link>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">{roleName}</p>
              </div>

              <button
                type="button"
                onClick={() => keycloakSignOut()}
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
            Panel Principal
          </h1>
          <p className="mt-2 text-muted-foreground">Información de sesión y permisos</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-card p-6 border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Estado de Sesión</h2>
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${sessionStatus.color} animate-pulse`} />
                <span className="text-sm font-medium text-foreground">{sessionStatus.label}</span>
              </div>
            </div>
            <dl>
              <InfoItem label="Estado" value={status} />
              <InfoItem label="Sesión válida" value={isSessionActive() ? 'Sí' : 'No'} />
              <InfoItem label="Expira en" value={formatDate(session?.expiresAt)} />
              <InfoItem label="Error" value={session?.error ?? 'Ninguno'} />
            </dl>
          </div>

          <div className="rounded-xl bg-card p-6 border border-border">
            <h2 className="text-lg font-bold text-foreground mb-6">Información del Usuario</h2>
            <dl>
              <InfoItem label="ID de Usuario" value={session?.user?.id} isMono />
              <InfoItem label="Nombre completo" value={session?.user?.name} />
              <InfoItem label="Correo electrónico" value={session?.user?.email} />
            </dl>
          </div>

          <div className="rounded-xl bg-card p-6 border border-border">
            <h2 className="text-lg font-bold text-foreground mb-6">Rol y Permisos</h2>
            <dl>
              <InfoItem label="ID del Rol" value={roleId} isMono />
              <InfoItem label="Nombre del Rol" value={roleName} />
              <InfoItem label="Módulos asignados" value={String(modules.length)} />
              <InfoItem label="Rutas permitidas" value={String(allowedRoutes.length)} />
            </dl>
          </div>

          <div className="rounded-xl bg-card p-6 border border-border">
            <h2 className="text-lg font-bold text-foreground mb-6">Tokens de Sesión</h2>
            <div className="space-y-4">
              <TokenDisplay title="Access Token" token={session?.accessToken} />
              <TokenDisplay title="ID Token" token={session?.idToken} />
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 border border-border lg:col-span-2">
            <h2 className="text-lg font-bold text-foreground mb-6">Módulos Asignados</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((mod) => (
                <div key={mod.id} className="flex items-center gap-3 rounded-lg bg-muted p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{mod.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{mod.route}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 border border-border lg:col-span-2">
            <h2 className="text-lg font-bold text-foreground mb-6">Rutas Permitidas</h2>
            <div className="rounded-lg bg-muted p-4 max-h-48 overflow-auto">
              <div className="flex flex-wrap gap-2">
                {allowedRoutes.map((route) => (
                  <span key={route} className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {route}
                  </span>
                ))}
              </div>
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

export default MainPage;
