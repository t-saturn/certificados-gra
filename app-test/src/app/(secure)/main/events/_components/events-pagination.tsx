import type { FC } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { EventsPagination } from '@/actions/fn-events';

export interface EventsPaginationProps {
  pagination: EventsPagination;
  buildPageUrl: (page: number) => string;
}

export const EventsPaginationBar: FC<EventsPaginationProps> = ({ pagination, buildPageUrl }) => {
  return (
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
  );
};
