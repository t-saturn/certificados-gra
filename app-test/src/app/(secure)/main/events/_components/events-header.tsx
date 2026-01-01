import type { FC } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EventsHeaderProps {}

export const EventsHeader: FC<EventsHeaderProps> = () => {
  return (
    <header className="flex justify-between items-center">
      <div>
        <h1 className="font-semibold text-xl">Gestión de Eventos</h1>
        <p className="text-muted-foreground text-sm">Crea y administra eventos registrados.</p>
      </div>

      <Link href="/main/events/new">
        <Button>Nuevo evento</Button>
      </Link>
    </header>
  );
};
