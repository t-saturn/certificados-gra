import type { FC } from 'react';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { EventListItem } from '@/actions/fn-events';

export interface EventsGridProps {
  events: EventListItem[];
}

export const EventsGrid: FC<EventsGridProps> = ({ events }) => {
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
                    {new Date(event.registration_open_at).toLocaleString('es-PE')} | {new Date(event.registration_close_at).toLocaleString('es-PE')}
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
};
