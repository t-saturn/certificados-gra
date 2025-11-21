/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import type React from 'react';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';

export default function NewTemplatePage() {
  const router = useRouter();
  const [templateData, setTemplateData] = useState({
    name: '',
    type: 'Certificado',
    description: '',
    useEditor: true,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    setTemplateData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as any).checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Plantilla creada:', templateData);
    router.push('/dashboard/admin/templates');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="hover:bg-muted p-2 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-bold text-foreground text-3xl">Crear Plantilla</h1>
          <p className="text-muted-foreground">Diseña una nueva plantilla de certificado o constancia</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-6 p-6 border-border">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground text-lg">Información Básica</h3>

            <div>
              <label className="block mb-2 font-medium text-foreground text-sm">Nombre de la Plantilla</label>
              <Input
                type="text"
                name="name"
                placeholder="Ej: Certificado Estándar"
                value={templateData.name}
                onChange={handleInputChange}
                required
                className="bg-muted border-border"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-foreground text-sm">Tipo de Documento</label>
              <select
                name="type"
                value={templateData.type}
                onChange={handleInputChange}
                className="bg-muted px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full text-foreground"
              >
                <option>Certificado</option>
                <option>Constancia</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium text-foreground text-sm">Descripción</label>
              <textarea
                name="description"
                placeholder="Describe el propósito de esta plantilla..."
                value={templateData.description}
                onChange={handleInputChange}
                className="bg-muted px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full text-foreground"
                rows={3}
              />
            </div>
          </div>

          {/* Template Options */}
          <div className="space-y-4 pt-6 border-border border-t">
            <h3 className="font-semibold text-foreground text-lg">Opciones de Creación</h3>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="useEditor" checked={templateData.useEditor} onChange={handleInputChange} className="border-border rounded w-4 h-4 cursor-pointer" />
              <span className="text-foreground">Usar editor visual avanzado</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="border-border rounded w-4 h-4 cursor-pointer" />
              <span className="text-foreground">Incluir campo de QR</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="border-border rounded w-4 h-4 cursor-pointer" />
              <span className="text-foreground">Incluir firma digital</span>
            </label>
          </div>

          {/* Available Fields */}
          <div className="space-y-4 pt-6 border-border border-t">
            <h3 className="font-semibold text-foreground text-lg">Campos Disponibles</h3>
            <p className="text-muted-foreground text-sm">Utiliza estos campos variables en tu plantilla:</p>
            <div className="gap-2 grid grid-cols-2 md:grid-cols-3">
              {['{nombre}', '{dni}', '{evento}', '{horas}', '{fecha}', '{codigo_qr}'].map((field) => (
                <div key={field} className="bg-muted px-3 py-2 border border-border rounded font-mono text-sm">
                  {field}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white">Crear Plantilla</Button>
        </div>
      </form>
    </div>
  );
}
