'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Edit2, Trash2, Search } from 'lucide-react';

interface Participant {
  id: number;
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  area: string;
  event: string;
  status: 'Activo' | 'Completado' | 'Cancelado';
}

const mockParticipants: Participant[] = [
  {
    id: 1,
    firstName: 'Juan',
    lastName: 'García',
    dni: '123456789',
    email: 'juan@example.com',
    area: 'IT',
    event: 'Capacitación Q2',
    status: 'Completado',
  },
  {
    id: 2,
    firstName: 'María',
    lastName: 'López',
    dni: '987654321',
    email: 'maria@example.com',
    area: 'HR',
    event: 'Taller Seguridad',
    status: 'Activo',
  },
  {
    id: 3,
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    dni: '456789123',
    email: 'carlos@example.com',
    area: 'Finance',
    event: 'Seminario Compliance',
    status: 'Activo',
  },
];

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>(mockParticipants);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParticipants = participants.filter(
    (p) =>
      p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.dni.includes(searchTerm),
  );

  const handleDelete = (id: number) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground text-xl">Gestión de Participantes</h1>
          <p className="text-md text-muted-foreground">Administra los participantes de tus eventos</p>
        </div>
        <Link href="/main/participants/upload">
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

      {/* Participants Table */}
      <Card className="p-2 border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Nombre</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">DNI</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Email</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Área</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Evento</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Estado</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.map((participant) => (
              <tr key={participant.id} className="hover:bg-muted/50 border-border border-b">
                <td className="px-4 py-3 font-medium text-foreground">
                  {participant.firstName} {participant.lastName}
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{participant.dni}</td>
                <td className="px-4 py-3 text-muted-foreground">{participant.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{participant.area}</td>
                <td className="px-4 py-3 text-muted-foreground">{participant.event}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      participant.status === 'Completado'
                        ? 'bg-green-100 text-green-700'
                        : participant.status === 'Activo'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {participant.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80" onClick={() => handleDelete(participant.id)}>
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
      <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
        <Card className="p-4 border-border">
          <p className="text-muted-foreground text-sm">Total de Participantes</p>
          <p className="mt-2 font-bold text-foreground text-2xl">{participants.length}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-muted-foreground text-sm">Activos</p>
          <p className="mt-2 font-bold text-foreground text-2xl">{participants.filter((p) => p.status === 'Activo').length}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-muted-foreground text-sm">Completados</p>
          <p className="mt-2 font-bold text-foreground text-2xl">{participants.filter((p) => p.status === 'Completado').length}</p>
        </Card>
      </div>
    </div>
  );
}
