'use client';

import type { FC, JSX } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRole } from '@/components/providers/role-provider';
import { useProfile } from '@/components/providers/profile-provider';
import type { ExtendedSession } from '@/types/auth.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, Users } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: FC<{ className?: string }>;
  trend?: string;
};

const StatCard: FC<StatCardProps> = ({ title, value, description, icon: Icon, trend }): JSX.Element => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">
        {trend && <span className="text-emerald-500">{trend} </span>}
        {description}
      </p>
    </CardContent>
  </Card>
);

const MainPage: FC = (): JSX.Element => {
  const { data, status } = useSession();
  const session = data as ExtendedSession | null;
  const { roleName, modules, allowedRoutes } = useRole();
  const { user } = useProfile();

  const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return 'No disponible';
    return new Date(timestamp * 1000).toLocaleString('es-PE', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  };

  const isSessionActive = (): boolean => {
    if (!session?.expiresAt) return false;
    // eslint-disable-next-line react-hooks/purity
    return Date.now() < session.expiresAt * 1000;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {user.name.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Panel de control del Sistema de Certificaciones Digitales</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Certificados Emitidos" value="1,234" description="desde el mes pasado" icon={FileText} trend="+12%" />
        <StatCard title="Solicitudes Pendientes" value="23" description="requieren atención" icon={Clock} />
        <StatCard title="Verificaciones" value="456" description="esta semana" icon={CheckCircle} trend="+8%" />
        <StatCard title="Usuarios Activos" value="89" description="en la plataforma" icon={Users} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información de Sesión</CardTitle>
            <CardDescription>Detalles de tu sesión actual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estado</span>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${status === 'authenticated' && isSessionActive() ? 'bg-emerald-500' : 'bg-destructive'}`} />
                <span className="text-sm font-medium">{status === 'authenticated' && isSessionActive() ? 'Activa' : 'Inactiva'}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rol</span>
              <span className="text-sm font-medium">{roleName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Expira</span>
              <span className="text-sm font-medium">{formatDate(session?.expiresAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permisos</CardTitle>
            <CardDescription>Módulos y rutas disponibles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Módulos asignados</span>
              <span className="text-sm font-medium">{modules.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rutas permitidas</span>
              <span className="text-sm font-medium">{allowedRoutes.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">ID de Usuario</span>
              <span className="text-sm font-mono truncate max-w-40">{user.id}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Módulos Disponibles</CardTitle>
          <CardDescription>Accesos rápidos a las secciones del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.slice(0, 6).map((mod) => (
              <Link key={mod.id} href={mod.route} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{mod.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{mod.route}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MainPage;
