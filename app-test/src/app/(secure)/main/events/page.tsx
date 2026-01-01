'use server';

import type { JSX } from 'react';
import { fn_get_events } from '@/actions/fn-events';
import EventsPage from './_components/page';

type EventsSearchParams = Record<string, string | undefined>;

const Page = async ({ searchParams }: { searchParams: Promise<EventsSearchParams> }): Promise<JSX.Element> => {
  const resolvedSearchParams = await searchParams;

  const page = Number(resolvedSearchParams.page ?? '1') || 1;
  const page_size = Number(resolvedSearchParams.page_size ?? '9') || 9;

  const search_query = resolvedSearchParams.search_query || undefined;
  const status = resolvedSearchParams.status && resolvedSearchParams.status !== 'ALL' ? resolvedSearchParams.status : undefined;

  const is_public = resolvedSearchParams.is_public === 'true' ? true : resolvedSearchParams.is_public === 'false' ? false : undefined;

  const user_id = resolvedSearchParams.user_id || undefined;
  const date_from = resolvedSearchParams.date_from || undefined;
  const date_to = resolvedSearchParams.date_to || undefined;

  const { items, pagination, filters } = await fn_get_events({ page, page_size, search_query, status, is_public, user_id, date_from, date_to });

  return <EventsPage events={items} pagination={pagination} filters={filters} originalSearchParams={resolvedSearchParams} />;
};

export default Page;
