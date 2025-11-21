'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, X } from 'lucide-react';

export default function CreateCertificatesPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    event: '',
    template: '',
    recipients: [] as string[],
  });
  const [newRecipient, setNewRecipient] = useState('');

  const events = ['Capacitación Q2 2024', 'Taller de Seguridad', 'Seminario de Compliance'];

  const templates = ['Certificado Estándar', 'Constancia de Asistencia', 'Certificado de Capacitación'];

  const handleAddRecipient = () => {
    if (newRecipient.trim()) {
      setFormData((prev) => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient],
      }));
      setNewRecipient('');
    }
  };

  const handleRemoveRecipient = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    console.log('Certificados a emitir:', formData);
    router.push('/main/certificates');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="hover:bg-muted p-2 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-bold text-foreground text-3xl">Emitir Certificados</h1>
          <p className="text-muted-foreground">Proceso de generación en lote de certificados</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex gap-2 md:gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${s <= step ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{s}</div>
            <div className="hidden sm:block text-muted-foreground text-xs md:text-sm">{s === 1 ? 'Evento' : s === 2 ? 'Plantilla' : 'Destinatarios'}</div>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="space-y-6 p-6 border-border min-h-96">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground text-lg">Selecciona un Evento</h3>
            <div className="space-y-2">
              {events.map((event) => (
                <label key={event} className="flex items-center gap-3 hover:bg-muted/50 p-4 border border-border rounded-lg cursor-pointer">
                  <input
                    type="radio"
                    name="event"
                    value={event}
                    checked={formData.event === event}
                    onChange={(e) => setFormData((prev) => ({ ...prev, event: e.target.value }))}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-foreground">{event}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground text-lg">Selecciona una Plantilla</h3>
            <p className="text-muted-foreground text-sm">Evento seleccionado: {formData.event}</p>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              {templates.map((template) => (
                <label key={template} className="hover:bg-muted/50 p-4 border border-border rounded-lg cursor-pointer">
                  <input
                    type="radio"
                    name="template"
                    value={template}
                    checked={formData.template === template}
                    onChange={(e) => setFormData((prev) => ({ ...prev, template: e.target.value }))}
                    className="w-4 h-4"
                  />
                  <div className="mt-3">
                    <p className="font-medium text-foreground">{template}</p>
                    <p className="mt-1 text-muted-foreground text-xs">Vista previa disponible</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground text-lg">Añade Destinatarios</h3>
            <p className="text-muted-foreground text-sm">
              Evento: {formData.event} | Plantilla: {formData.template}
            </p>

            {/* Add Recipient Form */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre del participante"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
                className="flex-1 bg-muted px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
              <Button onClick={handleAddRecipient} className="gap-2 bg-primary hover:bg-primary/90 text-white">
                <Plus className="w-4 h-4" />
                Añadir
              </Button>
            </div>

            {/* Recipients List */}
            <div className="space-y-2">
              {formData.recipients.length === 0 ? (
                <p className="py-4 text-muted-foreground text-sm text-center">No hay destinatarios añadidos</p>
              ) : (
                formData.recipients.map((recipient, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-muted p-3 border border-border rounded-lg">
                    <span className="text-foreground">{recipient}</span>
                    <button onClick={() => handleRemoveRecipient(idx)} className="p-1 text-destructive hover:text-destructive/80">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Summary */}
            <div className="bg-muted p-4 border border-border rounded-lg">
              <p className="text-muted-foreground text-sm">
                Total de certificados a generar: <span className="font-semibold text-foreground">{formData.recipients.length}</span>
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-end gap-4">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            Anterior
          </Button>
        )}

        {step < 3 ? (
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            disabled={(step === 1 && !formData.event) || (step === 2 && !formData.template)}
            onClick={() => setStep(step + 1)}
          >
            Siguiente
          </Button>
        ) : (
          <Button className="bg-primary hover:bg-primary/90 text-white" disabled={formData.recipients.length === 0} onClick={handleSubmit}>
            Emitir Certificados
          </Button>
        )}
      </div>
    </div>
  );
}
