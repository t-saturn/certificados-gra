import type { JSX } from 'react';
import { fn_get_event_detail, type EventDetailResult } from '@/actions/fn-event-detail';
import EventDetailClient from './content-page';

interface EventDetailPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

const EventDetailPage = async ({ params }: EventDetailPageProps): Promise<JSX.Element> => {
  const { eventId } = await params;

  const eventDetail: EventDetailResult = await fn_get_event_detail(eventId, {
    send_user_id: true,
  });

  return (
    <section className="space-y-4 p-6">
      <h1 className="mb-2 font-semibold text-2xl">Detalle del evento</h1>

      <EventDetailClient event={eventDetail} />
    </section>
  );
};

export default EventDetailPage;
