'use server';

import type { JSX } from 'react';
import { fn_get_events } from '@/actions/fn-events';
import EventsPage from './_components/page';

export default async function Page({ searchParams }: { searchParams: Record<string, string | undefined> }): Promise<JSX.Element> {
  // limpiar y convertir filtros
  const page = Number(searchParams.page ?? '1') || 1;
  const page_size = Number(searchParams.page_size ?? '10') || 10;

  const search_query = searchParams.search_query || undefined;
  const status = searchParams.status && searchParams.status !== 'ALL' ? searchParams.status : undefined;

  const is_public = searchParams.is_public === 'true' ? true : searchParams.is_public === 'false' ? false : undefined;

  const user_id = searchParams.user_id || undefined;
  const date_from = searchParams.date_from || undefined;
  const date_to = searchParams.date_to || undefined;

  const { items, pagination, filters } = await fn_get_events({ page, page_size, search_query, status, is_public, user_id, date_from, date_to });

  return <EventsPage events={items} pagination={pagination} filters={filters} originalSearchParams={searchParams} />;
}
