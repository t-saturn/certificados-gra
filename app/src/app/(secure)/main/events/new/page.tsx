'use client';

import type React from 'react';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';

export default function NewEventPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    type: 'Certificado',
    startDate: '',
    endDate: '',
    hours: '',
    responsible: '',
    description: '',
    hasEvaluation: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'select-one' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Evento creado:', formData);
    router.push('/main/events');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="hover:bg-muted p-2 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-bold text-foreground text-3xl">Crear Nuevo Evento</h1>
          <p className="text-muted-foreground">Completa el formulario para crear un evento de certificación</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-6 p-6 border-border">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground text-lg">Información Básica</h3>

            <div>
              <label className="block mb-2 font-medium text-foreground text-sm">Nombre del Evento</label>
              <Input
                type="text"
                name="name"
                placeholder="Ej: Capacitación Q2 2024"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="bg-muted border-border"
              />
            </div>

            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div>
                <label className="block mb-2 font-medium text-foreground text-sm">Tipo de Documento</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="bg-muted px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full text-foreground"
                >
                  <option>Certificado</option>
                  <option>Constancia</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 font-medium text-foreground text-sm">Horas de Duración</label>
                <Input type="number" name="hours" placeholder="8" value={formData.hours} onChange={handleInputChange} required className="bg-muted border-border" />
              </div>
            </div>

            <div>
              <label className="block mb-2 font-medium text-foreground text-sm">Responsable</label>
              <Input
                type="text"
                name="responsible"
                placeholder="Nombre del responsable"
                value={formData.responsible}
                onChange={handleInputChange}
                required
                className="bg-muted border-border"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-foreground text-sm">Descripción</label>
              <textarea
                name="description"
                placeholder="Descripción del evento..."
                value={formData.description}
                onChange={handleInputChange}
                className="bg-muted px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full text-foreground"
                rows={4}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4 pt-6 border-border border-t">
            <h3 className="font-semibold text-foreground text-lg">Fechas</h3>

            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div>
                <label className="block mb-2 font-medium text-foreground text-sm">Fecha de Inicio</label>
                <Input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required className="bg-muted border-border" />
              </div>

              <div>
                <label className="block mb-2 font-medium text-foreground text-sm">Fecha de Finalización</label>
                <Input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} required className="bg-muted border-border" />
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-4 pt-6 border-border border-t">
            <h3 className="font-semibold text-foreground text-lg">Opciones Adicionales</h3>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="hasEvaluation" checked={formData.hasEvaluation} onChange={handleInputChange} className="border-border rounded w-4 h-4 cursor-pointer" />
              <span className="text-foreground">El evento incluye evaluación</span>
            </label>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">
            Crear Evento
          </Button>
        </div>
      </form>
    </div>
  );
}
