'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, FileText, Clock, CheckCircle } from 'lucide-react';

interface Certificate {
  id: number;
  recipientName: string;
  event: string;
  code: string;
  issuedDate: string;
  status: 'Generado' | 'Pendiente de Firma' | 'Publicado' | 'Anulado';
  type: 'Certificado' | 'Constancia';
}

const mockCertificates: Certificate[] = [
  {
    id: 1,
    recipientName: 'Juan García',
    event: 'Capacitación Q2',
    code: 'CERT-2024-001',
    issuedDate: '2024-02-15',
    status: 'Publicado',
    type: 'Certificado',
  },
  {
    id: 2,
    recipientName: 'María López',
    event: 'Taller Seguridad',
    code: 'CONST-2024-002',
    issuedDate: '2024-02-20',
    status: 'Pendiente de Firma',
    type: 'Constancia',
  },
  {
    id: 3,
    recipientName: 'Carlos Rodríguez',
    event: 'Seminario Compliance',
    code: 'CERT-2024-003',
    issuedDate: '2024-03-01',
    status: 'Generado',
    type: 'Certificado',
  },
  {
    id: 4,
    recipientName: 'Ana Martínez',
    event: 'Capacitación Q2',
    code: 'CERT-2024-004',
    issuedDate: '2024-02-15',
    status: 'Publicado',
    type: 'Certificado',
  },
];

export default function CertificatesPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [certificates, setCertificates] = useState<Certificate[]>(mockCertificates);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');

  const filteredCerts = certificates.filter((cert) => {
    const matchesSearch = cert.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) || cert.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'Todos' || cert.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: Certificate['status']) => {
    switch (status) {
      case 'Publicado':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Pendiente de Firma':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <FileText className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground text-3xl">Certificados</h1>
          <p className="text-muted-foreground">Gestiona la emisión y estado de certificados</p>
        </div>
        <Link href="/main/certificates/new">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4" />
            Emitir Certificados
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex md:flex-row flex-col gap-4">
        <div className="relative flex-1">
          <Search className="top-3 left-3 absolute w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-muted pl-10 border-border" />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-muted px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
        >
          <option>Todos</option>
          <option>Generado</option>
          <option>Pendiente de Firma</option>
          <option>Publicado</option>
          <option>Anulado</option>
        </select>
      </div>

      {/* Certificates Table */}
      <Card className="p-6 border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Destinatario</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Código</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Evento</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Fecha</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Estado</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCerts.map((cert) => (
              <tr key={cert.id} className="hover:bg-muted/50 border-border border-b">
                <td className="px-4 py-3 font-medium text-foreground">{cert.recipientName}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{cert.code}</td>
                <td className="px-4 py-3 text-muted-foreground">{cert.event}</td>
                <td className="px-4 py-3 text-muted-foreground">{cert.issuedDate}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(cert.status)}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        cert.status === 'Publicado'
                          ? 'bg-green-100 text-green-700'
                          : cert.status === 'Pendiente de Firma'
                            ? 'bg-yellow-100 text-yellow-700'
                            : cert.status === 'Generado'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {cert.status}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/main/certificates/${cert.id}`}>
                    <Button variant="outline" size="sm">
                      Ver Detalles
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Stats */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border-border">
          <p className="text-muted-foreground text-sm">Total</p>
          <p className="mt-2 font-bold text-foreground text-2xl">{certificates.length}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-muted-foreground text-sm">Publicados</p>
          <p className="mt-2 font-bold text-green-600 text-2xl">{certificates.filter((c) => c.status === 'Publicado').length}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-muted-foreground text-sm">Pendiente de Firma</p>
          <p className="mt-2 font-bold text-yellow-600 text-2xl">{certificates.filter((c) => c.status === 'Pendiente de Firma').length}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-muted-foreground text-sm">Generados</p>
          <p className="mt-2 font-bold text-blue-600 text-2xl">{certificates.filter((c) => c.status === 'Generado').length}</p>
        </Card>
      </div>
    </div>
  );
}
