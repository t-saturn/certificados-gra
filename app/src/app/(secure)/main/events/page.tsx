import type { FC, JSX } from 'react';
import Link from 'next/link';
import { CalendarDays, Clock, Users } from 'lucide-react';

import { fn_get_events, type EventItem, type EventSchedule } from '@/actions/fn-events';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ------------- helpers & types -------------

const statusLabel: Record<string, string> = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Finalizado',
  COMPLETED: 'Finalizado',
  CANCELLED: 'Cancelado',
  DRAFT: 'Borrador',
};

const formatDateRange = (schedule: EventSchedule): string => {
  const start = new Date(schedule.start_datetime);
  const end = new Date(schedule.end_datetime);

  const sameDay = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate();

  const dateFormatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const timeFormatter = new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (sameDay) {
    return `${dateFormatter.format(start)} · ${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
  }

  return `${dateFormatter.format(start)} ${timeFormatter.format(start)} - ${timeFormatter.format(end)} ${timeFormatter.format(end)}`;
};

type BadgeVariant = 'default' | 'outline' | 'secondary';

const getStatusBadgeVariant = (status: string): BadgeVariant => {
  switch (status) {
    case 'SCHEDULED':
      return 'secondary';
    case 'IN_PROGRESS':
      return 'default';
    case 'FINISHED':
    case 'COMPLETED':
      return 'outline';
    case 'CANCELLED':
    case 'DRAFT':
    default:
      return 'outline';
  }
};

// ------------- grid de cards -------------

interface EventsGridProps {
  events: EventItem[];
}

const EventsGrid: FC<EventsGridProps> = ({ events }) => {
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
      <div className="gap-8 grid md:grid-cols-2 xl:grid-cols-3 p-5">
        {events.map((event: EventItem) => {
          const firstSchedule = event.schedules[0];
          const extraSessions = event.schedules.length - 1;

          return (
            <Link key={event.id} href={`/main/events/${event.id}`} className="h-full">
              <Card className="flex flex-col border-border/70 h-full transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row justify-between items-start gap-2 pb-3">
                  <div className="space-y-1">
                    {/* Título truncado + tooltip */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <h3 className="font-semibold text-base line-clamp-1 leading-snug cursor-default">{event.name}</h3>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start">
                        <p className="max-w-xs text-sm">{event.name}</p>
                      </TooltipContent>
                    </Tooltip>

                    <p className="text-muted-foreground text-xs">
                      {event.category_name ? (
                        <>
                          Categoría: <span className="font-medium">{event.category_name}</span>
                        </>
                      ) : (
                        'Sin categoría'
                      )}
                    </p>
                  </div>

                  {/* Arriba a la derecha solo el tipo de documento */}
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      {event.document_type_name}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs">
                  <div className="flex flex-col justify-center items-center gap-2 bg-muted/60 px-4 py-6 border border-border border-dashed rounded-md text-center">
                    <CalendarDays className="w-4 h-4" />
                    <p className="font-medium text-xs">Información del evento</p>
                    {firstSchedule ? (
                      <>
                        <p className="text-[11px] text-muted-foreground">{formatDateRange(firstSchedule)}</p>
                        {extraSessions > 0 && <p className="text-[11px] text-muted-foreground">+ {extraSessions} sesión(es) adicional(es)</p>}
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Sin horarios registrados</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      <span>
                        Participantes: <span className="font-medium">{event.participants_count}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{event.schedules.length} sesión(es)</span>
                    </div>
                  </div>

                  {/* Estado abajo a la derecha */}
                  <div className="flex justify-end mt-2">
                    <Badge variant={getStatusBadgeVariant(event.status)} className="text-[10px] uppercase tracking-wide">
                      {statusLabel[event.status] ?? event.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

// ------------- página (server component) -------------

const Page: FC = async (): Promise<JSX.Element> => {
  const { events, filters } = await fn_get_events({
    page: 1,
    page_size: 10,
    status: 'scheduled',
  });

  return (
    <section className="flex flex-col gap-6 p-2">
      <header className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="font-semibold text-xl">Gestión de Eventos</h1>
          <p className="text-muted-foreground text-sm">Crea y administra eventos para certificados y constancias.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/main/events/new">
            <Button className="text-xs sm:text-sm">Nuevo Evento</Button>
          </Link>
        </div>
      </header>

      <EventsGrid events={events} />

      <footer className="flex justify-between items-center mt-6 text-muted-foreground text-xs">
        <span>
          Página {filters.page} · Total: {filters.total}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!filters.has_prev_page}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={!filters.has_next_page}>
            Siguiente
          </Button>
        </div>
      </footer>
    </section>
  );
};

export default Page;
