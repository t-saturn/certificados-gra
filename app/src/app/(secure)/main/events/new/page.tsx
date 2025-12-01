/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { fn_get_templates } from '@/actions/fn-template';
import { fn_create_event } from '@/actions/fn-create-event';

// -------------------------------------
// Document Types (de tu tabla)
// -------------------------------------
const DOCUMENT_TYPES = [
  {
    id: '0a64ebf7-34a1-47d7-b0b1-208863f53e1d',
    code: 'CERTIFICATE',
    name: 'Certificado',
  },
  {
    id: 'ee9760e8-56a0-469a-9ad6-7f98649ec7a6',
    code: 'CONSTANCY',
    name: 'Constancia',
  },
  {
    id: '09c38888-6ac4-4b1a-9189-ab5abb94d1fd',
    code: 'RECOGNITION',
    name: 'Reconocimiento',
  },
];

export default function Page() {
  const router = useRouter();

  // ------------------------------
  // Form state
  // ------------------------------
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentTypeId, setDocumentTypeId] = useState(DOCUMENT_TYPES[0].id);
  const [location, setLocation] = useState('');

  // Template opcional
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Schedule dinámico
  const [schedules, setSchedules] = useState([{ start_datetime: '', end_datetime: '' }]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ------------------------------
  // Load Templates on demand
  // ------------------------------
  const handleLoadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const result = await fn_get_templates({
        page: 1,
        page_size: 50,
        type: undefined,
      });

      setTemplates(result.templates);
    } catch (err: any) {
      toast.error('No se pudieron cargar las plantillas', {
        description: err?.message,
      });
    } finally {
      setLoadingTemplates(false);
    }
  };

  // ------------------------------
  // Schedules handlers
  // ------------------------------
  const addSchedule = () => {
    setSchedules([...schedules, { start_datetime: '', end_datetime: '' }]);
  };

  const removeSchedule = (idx: number) => {
    setSchedules(schedules.filter((_, i) => i !== idx));
  };

  const updateSchedule = (idx: number, field: string, value: string) => {
    const updated = [...schedules];
    (updated[idx] as any)[field] = value;
    setSchedules(updated);
  };

  // ------------------------------
  // Submit
  // ------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return toast.error('El título es obligatorio');
    if (!description.trim()) return toast.error('La descripción es obligatoria');
    if (!documentTypeId) return toast.error('Debes seleccionar un tipo de documento');
    if (!location.trim()) return toast.error('La ubicación es obligatoria');

    const invalid = schedules.some((s) => !s.start_datetime.trim() || !s.end_datetime.trim());
    if (invalid) return toast.error('Todas las fechas deben completarse');

    setIsSubmitting(true);
    try {
      const body: any = {
        title,
        description,
        document_type_id: documentTypeId,
        location,
        schedules,
      };

      if (templateId) body.template_id = templateId;

      const result = await fn_create_event(body);

      toast.success(result.message);
      router.push('/main/events');
    } catch (err: any) {
      toast.error('Error al crear el evento', {
        description: err?.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => router.back()} className="hover:bg-muted p-2 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h1 className="font-bold text-3xl">Registrar Nuevo Evento</h1>
          <p className="text-muted-foreground">Completa la información para crear un nuevo evento.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-6 p-6 border-border">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Información del Evento</h2>

            <div className="flex flex-col gap-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Curso de Liderazgo..." />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Descripción *</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe los objetivos del evento..." />
            </div>

            <div className="gap-4 grid md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Tipo de Documento *</Label>
                <Select value={documentTypeId} onValueChange={setDocumentTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((dt) => (
                      <SelectItem key={dt.id} value={dt.id}>
                        {dt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Ubicación *</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej: Auditorio Principal" />
              </div>
            </div>

            {/* Optional Template */}
            <div className="flex flex-col gap-2">
              <Label>Plantilla </Label>
              <Select
                value={templateId ?? 'none'}
                onOpenChange={(open) => open && handleLoadTemplates()}
                onValueChange={(value) => {
                  if (value === 'none') {
                    setTemplateId(null);
                  } else {
                    setTemplateId(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una plantilla" />
                </SelectTrigger>

                <SelectContent>
                  {loadingTemplates ? (
                    <div className="flex justify-center items-center p-4 text-muted-foreground">
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      Cargando...
                    </div>
                  ) : (
                    <>
                      {/* Opción sin plantilla */}
                      <SelectItem value="none">Sin plantilla</SelectItem>

                      {templates.map((tmpl) => (
                        <SelectItem key={tmpl.id} value={tmpl.id}>
                          {tmpl.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Schedules */}
          <div className="space-y-4 pt-6 border-border border-t">
            <h2 className="font-semibold text-lg">Fechas del Evento *</h2>

            {schedules.map((sch, idx) => (
              <div key={idx} className="items-end gap-4 grid md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Inicio *</Label>
                  <Input type="datetime-local" value={sch.start_datetime} onChange={(e) => updateSchedule(idx, 'start_datetime', e.target.value)} />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Fin *</Label>
                  <Input type="datetime-local" value={sch.end_datetime} onChange={(e) => updateSchedule(idx, 'end_datetime', e.target.value)} />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="flex items-center gap-2 col-span-2 w-fit text-destructive"
                  onClick={() => removeSchedule(idx)}
                  disabled={schedules.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar fecha
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addSchedule} className="gap-2">
              <Plus className="w-4 h-4" />
              Agregar fecha
            </Button>
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>

          <Button disabled={isSubmitting} className="gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Crear Evento
          </Button>
        </div>
      </form>
    </div>
  );
}
