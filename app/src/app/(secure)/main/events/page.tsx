'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';

interface Event {
  id: number;
  name: string;
  type: 'Certificado' | 'Constancia';
  startDate: string;
  endDate: string;
  hours: number;
  participants: number;
  status: 'Programado' | 'En Proceso' | 'Completado' | 'Cancelado';
  responsible: string;
  hasEvaluation: boolean;
}

const mockEvents: Event[] = [
  {
    id: 1,
    name: 'Capacitación Q2 2024',
    type: 'Certificado',
    startDate: '2024-02-15',
    endDate: '2024-02-18',
    hours: 12,
    participants: 120,
    status: 'Completado',
    responsible: 'Juan García',
    hasEvaluation: true,
  },
  {
    id: 2,
    name: 'Taller de Seguridad',
    type: 'Constancia',
    startDate: '2024-02-20',
    endDate: '2024-02-21',
    hours: 8,
    participants: 85,
    status: 'En Proceso',
    responsible: 'María López',
    hasEvaluation: false,
  },
  {
    id: 3,
    name: 'Seminario de Compliance',
    type: 'Certificado',
    startDate: '2024-03-01',
    endDate: '2024-03-03',
    hours: 16,
    participants: 200,
    status: 'Programado',
    responsible: 'Roberto Pérez',
    hasEvaluation: true,
  },
];

export default function EventsPage() {
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) || event.responsible.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'Todos' || event.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: number) => {
    setEvents(events.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground text-xl">Gestión de Eventos</h1>
          <p className="text-muted-foreground text-sm">Crea y administra tus eventos de certificación</p>
        </div>
        <Link href="/dashboard/admin/events/new">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4" />
            Nuevo Evento
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex md:flex-row flex-col gap-4">
        <div className="relative flex-1">
          <Search className="top-3 left-3 absolute w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o responsable..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-muted pl-10 border-border" />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-muted px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
        >
          <option>Todos</option>
          <option>Programado</option>
          <option>En Proceso</option>
          <option>Completado</option>
          <option>Cancelado</option>
        </select>
      </div>

      {/* Events Table */}
      <Card className="bg-none p-2 border-border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="p-2 font-medium text-muted-foreground text-left">Evento</th>
              <th className="p-2 font-medium text-muted-foreground text-left">Tipo</th>
              <th className="p-2 font-medium text-muted-foreground text-left">Fechas</th>
              <th className="p-2 font-medium text-muted-foreground text-left">Participantes</th>
              <th className="p-2 font-medium text-muted-foreground text-left">Estado</th>
              <th className="p-2 font-medium text-muted-foreground text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((event) => (
              <tr
                key={event.id}
                className="hover:bg-muted/50 border-border border-b cursor-pointer"
                onClick={() => router.push(`/dashboard/admin/events/${event.id}/participants`)}
              >
                <td className="p-2">
                  <div className="text-xs">
                    <p className="font-medium text-foreground">{event.name}</p>
                    <p className="text-muted-foreground text-xs">Responsable: {event.responsible}</p>
                  </div>
                </td>
                <td className="p-2 text-foreground">
                  <span className={`px-2 py-1 rounded-sm text-xs font-medium ${event.type === 'Certificado' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {event.type}
                  </span>
                </td>
                <td className="p-2 text-muted-foreground">
                  <div className="text-sm">{event.startDate}</div>
                  <div className="text-muted-foreground text-xs">{event.hours}h</div>
                </td>
                <td className="p-2 font-medium text-foreground">{event.participants}</td>
                <td className="p-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      event.status === 'Completado'
                        ? 'bg-green-100 text-green-700'
                        : event.status === 'En Proceso'
                        ? 'bg-blue-100 text-blue-700'
                        : event.status === 'Programado'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {event.status}
                  </span>
                </td>
                <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    {/* Ver participantes / cargar */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => router.push(`/main/events/${event.id}/participants`)}
                      title="Gestionar participantes"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80" onClick={() => handleDelete(event.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Stats */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border-border">
          <p className="text-muted-foreground text-sm">Total de Eventos</p>
          <p className="mt-2 font-bold text-foreground text-2xl">{events.length}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-muted-foreground text-sm">En Proceso</p>
          <p className="mt-2 font-bold text-foreground text-2xl">{events.filter((e) => e.status === 'En Proceso').length}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-muted-foreground text-sm">Total de Participantes</p>
          <p className="mt-2 font-bold text-foreground text-2xl">{events.reduce((sum, e) => sum + e.participants, 0)}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-muted-foreground text-sm">Completados</p>
          <p className="mt-2 font-bold text-foreground text-2xl">{events.filter((e) => e.status === 'Completado').length}</p>
        </Card>
      </div>
    </div>
  );
}
