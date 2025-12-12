'use client';

import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, FileText, Users, Clock } from 'lucide-react';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import type { EventDetailResult, EventDetailSchedule, EventDetailParticipant } from '@/actions/fn-event-detail';

export interface EventDetailPageProps {
  event: EventDetailResult;
}

const formatDateTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
};

const EventDetailPage: FC<EventDetailPageProps> = ({ event }) => {
  const router = useRouter();

  const schedules: EventDetailSchedule[] = event.schedules ?? [];
  const participants: EventDetailParticipant[] = event.participants ?? [];

  const documentTypeName = event.template?.document_type_name ?? 'Sin tipo de documento';
  const templateName = event.template?.name ?? 'Sin plantilla asociada';

  return (
    <section className="flex flex-col gap-6 p-4">
      {/* Header */}
      <header className="flex items-center gap-4">
        <button type="button" onClick={() => router.back()} className="rounded-lg p-2 transition-colors hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px] uppercase">
              {event.status}
            </Badge>

            <Badge variant="outline" className="text-[10px] uppercase">
              {documentTypeName}
            </Badge>

            <Badge
              variant={event.is_public ? 'outline' : 'outline'}
              className={`text-[10px] uppercase ${event.is_public ? 'border-emerald-500/40 text-emerald-600' : 'border-amber-500/40 text-amber-600'}`}
            >
              {event.is_public ? 'Público' : 'Privado'}
            </Badge>

            <span>
              Creado: <strong>{formatDateTime(event.created_at)}</strong>
            </span>
            <span>
              Actualizado: <strong>{formatDateTime(event.updated_at)}</strong>
            </span>
          </div>

          <p className="mt-1 text-[11px] text-muted-foreground">
            Código evento: <span className="font-mono">{event.code}</span> · Serie certificado: <span className="font-mono">{event.certificate_series}</span> · Ruta orgánica:{' '}
            <span className="font-mono">{event.organizational_units_path}</span>
          </p>
        </div>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general" className="text-xs sm:text-sm">
            Información principal
          </TabsTrigger>
          <TabsTrigger value="participants" className="text-xs sm:text-sm">
            Participantes ({participants.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB: Información principal */}
        <TabsContent value="general" className="space-y-4">
          {/* Descripción */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4" />
                <span>Descripción</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{event.description || 'Sin descripción.'}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Detalles básicos */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="h-4 w-4" />
                  <span>Detalles del evento</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <span>Tipo de documento</span>
                  <span className="font-medium text-foreground">{documentTypeName}</span>
                </div>

                <div className="flex justify-between gap-2">
                  <span>Plantilla asociada</span>
                  <span className="font-medium text-foreground">{templateName}</span>
                </div>

                <div className="flex justify-between gap-2">
                  <span>Ubicación</span>
                  <span className="font-medium text-foreground">{event.location || '—'}</span>
                </div>

                <div className="flex justify-between gap-2">
                  <span>Máx. participantes</span>
                  <span className="font-medium text-foreground">{event.max_participants ?? '—'}</span>
                </div>

                <div className="flex justify-between gap-2">
                  <span>Creado por</span>
                  <span className="font-mono text-[11px]">{event.created_by}</span>
                </div>
              </CardContent>
            </Card>

            {/* Inscripción + Fechas de registro */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4" />
                  <span>Inscripciones / Fechas</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex flex-col rounded-md border border-dashed border-border bg-muted/40 px-3 py-2">
                  <span className="text-[11px] uppercase text-muted-foreground">Período de inscripción</span>
                  <span>
                    <strong>Desde:</strong> {formatDateTime(event.registration_open_at)}
                  </span>
                  <span>
                    <strong>Hasta:</strong> {formatDateTime(event.registration_close_at)}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Sesiones del evento</p>

                  {schedules.length === 0 ? (
                    <p>No hay sesiones registradas.</p>
                  ) : (
                    <ul className="space-y-2">
                      {schedules.map((s, idx) => (
                        <li key={s.id ?? `${s.start_datetime}-${idx}`} className="flex flex-col rounded-md border border-border bg-muted/40 px-3 py-2">
                          <span className="text-[11px] uppercase text-muted-foreground">Sesión {idx + 1}</span>
                          <span>
                            <strong>Inicio:</strong> {formatDateTime(s.start_datetime)}
                          </span>
                          <span>
                            <strong>Fin:</strong> {formatDateTime(s.end_datetime)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: Participantes */}
        <TabsContent value="participants">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <div>
                  <p className="text-sm font-semibold">Participantes</p>
                  <p className="text-xs text-muted-foreground">Total: {participants.length}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {participants.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">Este evento aún no tiene participantes registrados.</div>
              ) : (
                <div className="max-h-[420px] overflow-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">DNI</th>
                        <th className="px-3 py-2 text-left font-semibold">Nombre completo</th>
                        <th className="px-3 py-2 text-left font-semibold">Email</th>
                        <th className="px-3 py-2 text-left font-semibold">Teléfono</th>
                        <th className="px-3 py-2 text-left font-semibold">Registro</th>
                        <th className="px-3 py-2 text-left font-semibold">Asistencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((p) => {
                        const fullName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
                        return (
                          <tr key={p.id} className="border-t">
                            <td className="px-3 py-1 font-mono">{p.national_id}</td>
                            <td className="px-3 py-1">{fullName || '—'}</td>
                            <td className="px-3 py-1">{p.email || '—'}</td>
                            <td className="px-3 py-1">{p.phone || '—'}</td>
                            <td className="px-3 py-1">
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {p.registration_status}
                              </Badge>
                            </td>
                            <td className="px-3 py-1">
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {p.attendance_status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default EventDetailPage;
