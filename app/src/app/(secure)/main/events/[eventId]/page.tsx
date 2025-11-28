import type { JSX } from 'react';

interface EventDetailPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

const EventDetailPage = async ({ params }: EventDetailPageProps): Promise<JSX.Element> => {
  const { eventId } = await params;

  return (
    <section className="p-6">
      <h1 className="mb-4 font-semibold text-xl">Detalle del evento</h1>
      <p className="text-sm">
        ID del evento: <span className="font-mono font-bold">{eventId}</span>
      </p>
    </section>
  );
};

export default EventDetailPage;
