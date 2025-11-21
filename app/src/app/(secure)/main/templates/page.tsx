'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';

interface Template {
  id: number;
  name: string;
  type: 'Certificado' | 'Constancia';
  description: string;
  createdDate: string;
  updatedDate: string;
}

const mockTemplates: Template[] = [
  {
    id: 1,
    name: 'Certificado Estándar',
    type: 'Certificado',
    description: 'Plantilla estándar para certificados de eventos',
    createdDate: '2024-01-15',
    updatedDate: '2024-02-01',
  },
  {
    id: 2,
    name: 'Constancia de Asistencia',
    type: 'Constancia',
    description: 'Plantilla para constancias de asistencia',
    createdDate: '2024-01-10',
    updatedDate: '2024-01-25',
  },
  {
    id: 3,
    name: 'Certificado de Capacitación',
    type: 'Certificado',
    description: 'Plantilla especializada para capacitaciones internas',
    createdDate: '2024-02-01',
    updatedDate: '2024-02-10',
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);

  const handleDelete = (id: number) => {
    setTemplates(templates.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground text-3xl">Gestión de Plantillas</h1>
          <p className="text-muted-foreground">Crea y administra plantillas de certificados y constancias</p>
        </div>
        <Link href="/main/templates/new">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4" />
            Nueva Plantilla
          </Button>
        </Link>
      </div>

      {/* Templates Grid */}
      <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg p-6 border-border rounded-md transition-shadow">
            <div className="space-y-4">
              {/* Template Header */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-foreground text">{template.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${template.type === 'Certificado' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {template.type}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">{template.description}</p>
              </div>

              {/* Dates */}
              <div className="space-y-1 text-muted-foreground text-xs">
                <p>Creada: {template.createdDate}</p>
                <p>Actualizada: {template.updatedDate}</p>
              </div>

              {/* Preview Area */}
              <div className="flex justify-center items-center bg-muted p-4 border border-border rounded min-h-32">
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Vista Previa</p>
                  <p className="mt-2 text-muted-foreground text-xs">Campos variables:</p>
                  <p className="mt-1 font-mono text-muted-foreground text-xs">
                    {'{'} nombre, dni, evento, horas {'}'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-border border-t">
                <Button variant="ghost" size="sm" className="flex-1 gap-2 text-muted-foreground hover:text-foreground">
                  <Eye className="w-4 h-4" />
                  Ver
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 gap-2 text-muted-foreground hover:text-foreground">
                  <Edit2 className="w-4 h-4" />
                  Editar
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 gap-2 text-destructive hover:text-destructive/80" onClick={() => handleDelete(template.id)}>
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
