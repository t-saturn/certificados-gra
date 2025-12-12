/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import type { FC } from 'react';
import { useRouter } from 'next/navigation';

import type { EventListItem, EventsPagination, EventsFilters } from '@/actions/fn-events';

import { EventsHeader } from './events-header';
import { EventsGrid } from './events-grid';
import { EventsFilters as EventsFiltersBar, type EventsFilterFormValues } from './events-filters';
import { EventsPaginationBar } from './events-pagination';

export interface EventsPageProps {
  events: EventListItem[];
  pagination: EventsPagination;
  filters: EventsFilters;
  originalSearchParams: Record<string, string | undefined>;
}

const EventsPage: FC<EventsPageProps> = ({ events, pagination, filters, originalSearchParams }) => {
  const router = useRouter();

  // Valores iniciales para filtros (mezcla de searchParams y filters del backend)
  const initialSearchQuery = originalSearchParams.search_query ?? filters.search_query ?? '';
  const initialStatus = originalSearchParams.status ?? filters.status ?? 'ALL';

  const initialIsPublic: 'all' | 'true' | 'false' =
    originalSearchParams.is_public === 'true'
      ? 'true'
      : originalSearchParams.is_public === 'false'
      ? 'false'
      : filters.is_public === true
      ? 'true'
      : filters.is_public === false
      ? 'false'
      : 'all';

  const initialDateFrom = originalSearchParams.date_from ?? filters.date_from ?? '';
  const initialDateTo = originalSearchParams.date_to ?? filters.date_to ?? '';

  const buildPageUrl = (page: number): string => {
    const params = new URLSearchParams(originalSearchParams as any);
    params.set('page', String(page));
    return `/main/events?${params.toString()}`;
  };

  const handleApplyFilters = (values: EventsFilterFormValues): void => {
    const params = new URLSearchParams(originalSearchParams as any);

    // page siempre vuelve a 1 al cambiar filtros
    params.set('page', '1');

    // search_query
    if (values.search_query) params.set('search_query', values.search_query);
    else params.delete('search_query');

    // status
    if (values.status && values.status !== 'ALL') params.set('status', values.status);
    else params.delete('status');

    // is_public
    if (values.is_public === 'true') params.set('is_public', 'true');
    else if (values.is_public === 'false') params.set('is_public', 'false');
    else params.delete('is_public');

    // date_from / date_to
    if (values.date_from) params.set('date_from', values.date_from);
    else params.delete('date_from');

    if (values.date_to) params.set('date_to', values.date_to);
    else params.delete('date_to');

    router.push(`/main/events?${params.toString()}`);
  };

  return (
    <section className="flex flex-col gap-6 p-2">
      <EventsHeader />

      <div className="px-2">
        <EventsFiltersBar
          initialSearchQuery={initialSearchQuery}
          initialStatus={initialStatus}
          initialIsPublic={initialIsPublic}
          initialDateFrom={initialDateFrom}
          initialDateTo={initialDateTo}
          onApplyFilters={handleApplyFilters}
        />
      </div>

      <EventsGrid events={events} />

      <EventsPaginationBar pagination={pagination} buildPageUrl={buildPageUrl} />
    </section>
  );
};

export default EventsPage;
