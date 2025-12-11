'use server';

import type { JSX } from 'react';
import { fn_get_event_detail, type EventDetailResult } from '@/actions/fn-event-detail';
import EventDetailPage from './_components/page';

type PageParams = {
  eventId: string;
};

export default async function Page({ params }: { params: Promise<PageParams> }): Promise<JSX.Element> {
  // Next 13.5+: params es una Promise
  const { eventId } = await params;

  // Si quisieras enviar el user_id:
  const event: EventDetailResult = await fn_get_event_detail(eventId);

  return <EventDetailPage event={event} />;
}
