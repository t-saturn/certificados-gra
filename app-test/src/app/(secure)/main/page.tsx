/* eslint-disable @typescript-eslint/no-unused-vars */
import type { JSX } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/auth';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { Award, CheckCircle2, Clock, FilePlus2, Files, Search, ShieldCheck, UploadCloud, User2, XCircle } from 'lucide-react';

/**
 * Vista: Panel principal (Dashboard) visible para todos los usuarios.
 * - Server Component (NO 'use client')
 * - Lista reciente + KPIs + acciones rápidas + buscador
 *
 * Conecta tus server actions aquí cuando las tengas listas (reemplaza los mocks).
 */

type SearchParams = Record<string, string | string[] | undefined>;

type CertificateStatus = 'DRAFT' | 'ISSUED' | 'SIGNED' | 'REVOKED' | 'ERROR';

type CertificateRow = {
  id: string;
  code: string; // correlativo / número
  title: string; // nombre del certificado
  holder_name: string; // participante / usuario final
  created_at: string; // ISO
  status: CertificateStatus;
};

type DashboardStats = {
  total: number;
  issued: number;
  signed: number;
  pending: number; // drafts/issued not signed
  revoked: number;
  errors: number;
};

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusBadge(status: CertificateStatus): JSX.Element {
  const base = 'rounded-full';
  switch (status) {
    case 'SIGNED':
      return (
        <Badge className={base} variant="default">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          Firmado
        </Badge>
      );
    case 'ISSUED':
      return (
        <Badge className={base} variant="secondary">
          <Award className="mr-1 h-3.5 w-3.5" />
          Emitido
        </Badge>
      );
    case 'DRAFT':
      return (
        <Badge className={base} variant="outline">
          <Clock className="mr-1 h-3.5 w-3.5" />
          Borrador
        </Badge>
      );
    case 'REVOKED':
      return (
        <Badge className={base} variant="destructive">
          <XCircle className="mr-1 h-3.5 w-3.5" />
          Revocado
        </Badge>
      );
    case 'ERROR':
      return (
        <Badge className={base} variant="destructive">
          <XCircle className="mr-1 h-3.5 w-3.5" />
          Error
        </Badge>
      );
    default:
      return (
        <Badge className={base} variant="outline">
          {status}
        </Badge>
      );
  }
}

/* -------------------- MOCKS (reemplaza por server actions reales) -------------------- */

// eslint-disable-next-line no-unused-vars
async function getDashboardStats(_userId: string): Promise<DashboardStats> {
  // TODO: reemplazar por: await fn_get_certificate_dashboard_stats(userId)
  return {
    total: 128,
    issued: 72,
    signed: 49,
    pending: 21,
    revoked: 3,
    errors: 2,
  };
}

async function listRecentCertificates(args: { userId: string; q?: string; status?: CertificateStatus | 'ALL'; page?: number; page_size?: number }): Promise<{ items: CertificateRow[]; total: number }> {
  // TODO: reemplazar por: await fn_list_certificates({ ...args })
  const base: CertificateRow[] = [
    {
      id: 'c-001',
      code: 'CERT-2025-00087',
      title: 'Certificado de Participación - Seminario',
      holder_name: 'María Ramos',
      created_at: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
      status: 'SIGNED',
    },
    {
      id: 'c-002',
      code: 'CERT-2025-00086',
      title: 'Constancia de Asistencia - Taller',
      holder_name: 'Luis Quispe',
      created_at: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
      status: 'ISSUED',
    },
    {
      id: 'c-003',
      code: 'CERT-2025-00085',
      title: 'Certificado de Aprobación - Curso',
      holder_name: 'Ana Pérez',
      created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      status: 'DRAFT',
    },
    {
      id: 'c-004',
      code: 'CERT-2025-00084',
      title: 'Certificado de Participación - Conferencia',
      holder_name: 'Diego Rojas',
      created_at: new Date(Date.now() - 1000 * 60 * 560).toISOString(),
      status: 'REVOKED',
    },
  ];

  const q = (args.q ?? '').trim().toLowerCase();
  const status = args.status ?? 'ALL';

  let items = base;
  if (q) {
    items = items.filter((x) => x.code.toLowerCase().includes(q) || x.title.toLowerCase().includes(q) || x.holder_name.toLowerCase().includes(q));
  }
  if (status !== 'ALL') items = items.filter((x) => x.status === status);

  return { items, total: items.length };
}

/* ----------------------------------------------------------------------------------- */

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }): Promise<JSX.Element> {
  const sp = (await searchParams) ?? {};
  const q = (toArray(sp.q)[0] ?? '').toString();
  const status = (toArray(sp.status)[0] ?? 'ALL').toString() as CertificateStatus | 'ALL';

  const session = await auth();
  const userId = session?.user?.id ?? 'anonymous';
  const userName = session?.user?.name ?? 'Usuario';

  const [stats, recent] = await Promise.all([getDashboardStats(userId), listRecentCertificates({ userId, q, status, page: 1, page_size: 10 })]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard de documentos</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User2 className="h-4 w-4" />
            <span>{userName}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild className="gap-2">
            <Link href="/certificates/new">
              <FilePlus2 className="h-4 w-4" />
              Nuevo certificado
            </Link>
          </Button>

          <Button asChild variant="outline" className="gap-2">
            <Link href="/certificates/batch">
              <UploadCloud className="h-4 w-4" />
              Carga masiva
            </Link>
          </Button>

          <Button asChild variant="secondary" className="gap-2">
            <Link href="/verify">
              <ShieldCheck className="h-4 w-4" />
              Verificar
            </Link>
          </Button>
        </div>
      </div>

      <Separator className="my-6" />

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-semibold">{stats.total}</div>
            <Files className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Emitidos</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-semibold">{stats.issued}</div>
            <Award className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Firmados</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-semibold">{stats.signed}</div>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-semibold">{stats.pending}</div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas</CardTitle>
            <CardDescription className="text-xs">Revocados / Errores</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-end gap-3">
              <div className="text-xl font-semibold">{stats.revoked}</div>
              <div className="text-sm text-muted-foreground">/ {stats.errors}</div>
            </div>
            <XCircle className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Buscar + estado */}
      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Búsqueda rápida</CardTitle>
            <CardDescription>Por código, título o participante</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <form action="/main" className="w-full">
                <Input name="q" defaultValue={q} placeholder="Ej: CERT-2025-00087, Seminario, María..." className="pl-9" />
                {status && status !== 'ALL' && <input type="hidden" name="status" value={status} />}
              </form>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['ALL', 'DRAFT', 'ISSUED', 'SIGNED', 'REVOKED', 'ERROR'] as const).map((s) => {
                const active = status === s;
                return (
                  <Button key={s} asChild size="sm" variant={active ? 'default' : 'outline'} className="h-8 rounded-full">
                    <Link href={`/main?q=${encodeURIComponent(q)}&status=${s}`}>{s === 'ALL' ? 'Todos' : s}</Link>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Acciones</CardTitle>
            <CardDescription>Atajos para el día a día</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/events">
                <Clock className="h-4 w-4" />
                Ver eventos
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/certificates">
                <Files className="h-4 w-4" />
                Ir a certificados
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/audit">
                <ShieldCheck className="h-4 w-4" />
                Auditoría
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recientes */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Certificados recientes</CardTitle>
              <CardDescription>
                {recent.total} resultado(s){q ? ` para “${q}”` : ''}
                {status !== 'ALL' ? ` · estado: ${status}` : ''}
              </CardDescription>
            </div>

            <Button asChild variant="secondary" size="sm" className="gap-2">
              <Link href="/certificates">
                <Files className="h-4 w-4" />
                Ver todo
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Certificado</th>
                  <th className="px-4 py-3 font-medium">Titular</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {recent.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No hay certificados para mostrar.
                    </td>
                  </tr>
                ) : (
                  recent.items.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{c.code}</td>
                      <td className="px-4 py-3">{c.title}</td>
                      <td className="px-4 py-3">{c.holder_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(c.created_at)}</td>
                      <td className="px-4 py-3">{statusBadge(c.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="outline" className="gap-2">
                          <Link href={`/certificates/${c.id}`}>
                            <ShieldCheck className="h-4 w-4" />
                            Abrir
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span>Los certificados firmados son verificables desde “Verificar”.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Tip: usa “Carga masiva” para emitir/firmar en lote.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
