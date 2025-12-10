/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Link from 'next/link';
import { CalendarDays, Users } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

import type { EventListItem, EventsPagination, EventsFilters } from '@/actions/fn-events';

// ===============================================
// GRID DEL CLIENTE
// ===============================================

function EventsGrid({ events }: { events: EventListItem[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center py-20 text-muted-foreground text-sm">
        <CalendarDays className="mb-2 w-6 h-6" />
        <p>No se encontraron eventos.</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3 p-5">
        {events.map((event) => (
          <Link key={event.id} href={`/main/events/${event.id}`} className="h-full">
            <Card className="flex flex-col border-border/70 h-full transition-shadow cursor-pointer">
              <CardHeader className="flex justify-between items-start gap-2 pb-3">
                <div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3 className="font-semibold text-base line-clamp-1">{event.title}</h3>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{event.title}</p>
                    </TooltipContent>
                  </Tooltip>

                  <p className="text-xs text-muted-foreground">
                    Código: <b>{event.code}</b>
                  </p>
                </div>

                <Badge variant="outline" className="text-[10px] uppercase">
                  {event.document_type_name}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-3 text-xs">
                <div className="bg-muted/60 p-4 border border-dashed rounded-md text-center">
                  <CalendarDays className="w-4 h-4 mx-auto mb-1" />
                  <p className="font-medium">Inscripciones</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(event.registration_open_at).toLocaleString('es-PE')}
                    {' – '}
                    {new Date(event.registration_close_at).toLocaleString('es-PE')}
                  </p>
                </div>

                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>
                    Máx. participantes: <b>{event.max_participants ?? '—'}</b>
                  </span>

                  <span>{event.is_public ? 'Público' : 'Privado'}</span>
                </div>

                <div className="flex justify-end">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {event.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </TooltipProvider>
  );
}

// ===============================================
// CLIENT PAGE WRAPPER
// ===============================================

export default function ContentPage({
  events,
  pagination,
  filters,
  originalSearchParams,
}: {
  events: EventListItem[];
  pagination: EventsPagination;
  filters: EventsFilters;
  originalSearchParams: Record<string, string | undefined>;
}) {
  // Construcción de la URL de paginación en el cliente
  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams(originalSearchParams as any);
    params.set('page', String(page));
    return `/main/events?${params.toString()}`;
  };

  return (
    <section className="flex flex-col gap-6 p-2">
      {/* HEADER */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="font-semibold text-xl">Gestión de Eventos</h1>
          <p className="text-muted-foreground text-sm">Crea y administra eventos registrados.</p>
        </div>

        <Link href="/main/events/new">
          <Button>Nuevo evento</Button>
        </Link>
      </header>

      {/* GRID */}
      <EventsGrid events={events} />

      {/* FOOTER */}
      <footer className="flex justify-between items-center text-xs text-muted-foreground">
        <span>
          Página {pagination.page} de {pagination.total_pages} · Total: {pagination.total_items}
        </span>

        <div className="flex gap-2">
          <Link href={buildPageUrl(pagination.page - 1)} aria-disabled={!pagination.has_prev_page}>
            <Button variant="outline" size="sm" disabled={!pagination.has_prev_page}>
              Anterior
            </Button>
          </Link>

          <Link href={buildPageUrl(pagination.page + 1)} aria-disabled={!pagination.has_next_page}>
            <Button variant="outline" size="sm" disabled={!pagination.has_next_page}>
              Siguiente
            </Button>
          </Link>
        </div>
      </footer>
    </section>
  );
}
