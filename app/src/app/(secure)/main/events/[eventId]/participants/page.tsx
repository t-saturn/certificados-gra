'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Search, Trash2 } from 'lucide-react';

interface Participant {
  id: number;
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  area: string;
  status: 'Activo' | 'Completado' | 'Cancelado';
}

const mockParticipants: Participant[] = [
  { id: 1, firstName: 'Juan', lastName: 'García', dni: '123456789', email: 'juan@example.com', area: 'IT', status: 'Completado' },
  { id: 2, firstName: 'María', lastName: 'López', dni: '987654321', email: 'maria@example.com', area: 'HR', status: 'Activo' },
];

export default function EventParticipantsPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [participants, setParticipants] = useState<Participant[]>(mockParticipants);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(
    () =>
      participants.filter(
        (p) =>
          p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.dni.includes(searchTerm),
      ),
    [participants, searchTerm],
  );

  const handleDelete = (id: number) => setParticipants((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground text-xl">Participantes del Evento</h1>
          <p className="text-muted-foreground text-sm">Evento ID: {eventId}</p>
        </div>

        {/* IMPORTANTE: upload amarrado al evento */}
        <Link href={`/main/events/${eventId}/participants/upload`}>
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-white">
            <Upload className="w-4 h-4" />
            Registrar Datos
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="top-3 left-3 absolute w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, email o DNI..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-muted pl-10 border-border" />
      </div>

      {/* Table */}
      <Card className="p-2 border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Nombre</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">DNI</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Email</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Área</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Estado</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-muted/50 border-border border-b">
                <td className="px-4 py-3 font-medium text-foreground">
                  {p.firstName} {p.lastName}
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{p.dni}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.area}</td>
                <td className="px-4 py-3">
                  <span className="bg-blue-100 px-3 py-1 rounded-full font-medium text-blue-700 text-xs">{p.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
