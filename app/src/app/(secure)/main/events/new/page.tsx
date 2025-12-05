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
import { Switch } from '@/components/ui/switch';

import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { fn_get_document_templates, type DocumentTemplateItem } from '@/actions/fn-doc-template';
import { fn_create_event, type CreateEventBody } from '@/actions/fn-events';
import { fn_get_file_preview, type FilePreviewResult } from '@/actions/fn-file-preview';
import Image from 'next/image';

type ScheduleForm = { start_datetime: string; end_datetime: string };

type TemplatePreviewState = {
  src: string | null;
  kind: 'image' | 'pdf' | 'text' | null;
  loading: boolean;
  error: string | null;
};

type ParticipantForm = {
  national_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  registration_source: string;
};

export default function Page() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Catálogo de plantillas
  const [templates, setTemplates] = useState<DocumentTemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Form state (solo campos del body real)
  const [isPublic, setIsPublic] = useState(true);
  const [code, setCode] = useState('');
  const [certificateSeries, setCertificateSeries] = useState('CERT');
  const [organizationalUnitsPath, setOrganizationalUnitsPath] = useState('GGR|OTIC');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');

  const [registrationOpenAt, setRegistrationOpenAt] = useState('');
  const [registrationCloseAt, setRegistrationCloseAt] = useState('');

  // Plantilla (obligatoria en este flujo)
  const [templateId, setTemplateId] = useState<string | null>(null);

  // Vista previa del file_id (PDF principal) y prev_file_id (PDF asociado)
  const [mainPreview, setMainPreview] = useState<TemplatePreviewState>({
    src: null,
    kind: null,
    loading: false,
    error: null,
  });
  const [associatedPreview, setAssociatedPreview] = useState<TemplatePreviewState>({
    src: null,
    kind: null,
    loading: false,
    error: null,
  });

  // Schedule dinámico
  const [schedules, setSchedules] = useState<ScheduleForm[]>([{ start_datetime: '', end_datetime: '' }]);

  // Participantes (opcionales)
  const [participants, setParticipants] = useState<ParticipantForm[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === templateId) || null;

  // Cargar plantillas on demand
  const handleLoadTemplates = async () => {
    if (templates.length > 0) return; // ya cargado

    setLoadingTemplates(true);
    try {
      const result = await fn_get_document_templates({
        page: 1,
        page_size: 50,
        is_active: true,
      });

      setTemplates(result.items);
    } catch (err: any) {
      console.error(err);
      toast.error('No se pudieron cargar las plantillas', {
        description: err?.message,
      });
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Preview de la plantilla seleccionada
  const loadTemplatePreviews = async (tmpl: DocumentTemplateItem | undefined) => {
    // Reset
    setMainPreview({ src: null, kind: null, loading: false, error: null });
    setAssociatedPreview({ src: null, kind: null, loading: false, error: null });

    if (!tmpl) return;

    // file_id (PDF principal)
    if (tmpl.file_id) {
      setMainPreview((prev) => ({ ...prev, loading: true }));
      try {
        const result: FilePreviewResult = await fn_get_file_preview(tmpl.file_id);
        if (result.kind === 'pdf' || result.kind === 'image') {
          setMainPreview({
            src: result.url,
            kind: result.kind,
            loading: false,
            error: null,
          });
        } else {
          setMainPreview({
            src: null,
            kind: result.kind,
            loading: false,
            error: 'Tipo de archivo no soportado (se esperaba PDF o imagen).',
          });
        }
      } catch (err: any) {
        console.error(err);
        setMainPreview({
          src: null,
          kind: null,
          loading: false,
          error: err?.message ?? 'Error al obtener vista previa del PDF principal.',
        });
      }
    }

    // prev_file_id (PDF asociado)
    if (tmpl.prev_file_id) {
      setAssociatedPreview((prev) => ({ ...prev, loading: true }));
      try {
        const result: FilePreviewResult = await fn_get_file_preview(tmpl.prev_file_id);
        if (result.kind === 'pdf' || result.kind === 'image') {
          setAssociatedPreview({
            src: result.url,
            kind: result.kind,
            loading: false,
            error: null,
          });
        } else {
          setAssociatedPreview({
            src: null,
            kind: result.kind,
            loading: false,
            error: 'Tipo de archivo no soportado (se esperaba PDF o imagen).',
          });
        }
      } catch (err: any) {
        console.error(err);
        setAssociatedPreview({
          src: null,
          kind: null,
          loading: false,
          error: err?.message ?? 'Error al obtener vista previa del PDF asociado.',
        });
      }
    }
  };

  // Schedules handlers
  const addSchedule = () => {
    setSchedules([...schedules, { start_datetime: '', end_datetime: '' }]);
  };

  const removeSchedule = (idx: number) => {
    setSchedules(schedules.filter((_, i) => i !== idx));
  };

  const updateSchedule = (idx: number, field: keyof ScheduleForm, value: string) => {
    const updated = [...schedules];
    updated[idx] = { ...updated[idx], [field]: value };
    setSchedules(updated);
  };

  // Participants handlers
  const addParticipant = () => {
    setParticipants((prev) => [...prev, { national_id: '', first_name: '', last_name: '', phone: '', email: '', registration_source: 'SELF' }]);
  };

  const removeParticipant = (idx: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateParticipant = (idx: number, field: keyof ParticipantForm, value: string) => {
    setParticipants((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  // Validaciones por paso
  const validateStep1 = (): boolean => {
    if (!code.trim()) {
      toast.error('La oficina / dependencia es obligatoria');
      return false;
    }
    if (!certificateSeries.trim()) {
      toast.error('La serie de certificados es obligatoria');
      return false;
    }
    if (!organizationalUnitsPath.trim()) {
      toast.error('La ruta de unidades organizacionales es obligatoria');
      return false;
    }
    if (!title.trim()) {
      toast.error('El título es obligatorio');
      return false;
    }
    if (!description.trim()) {
      toast.error('La descripción es obligatoria');
      return false;
    }
    if (!location.trim()) {
      toast.error('La ubicación es obligatoria');
      return false;
    }
    if (!registrationOpenAt) {
      toast.error('La fecha de apertura de inscripciones es obligatoria');
      return false;
    }
    if (!registrationCloseAt) {
      toast.error('La fecha de cierre de inscripciones es obligatoria');
      return false;
    }

    const invalid = schedules.some((s) => !s.start_datetime.trim() || !s.end_datetime.trim());
    if (invalid) {
      toast.error('Todas las fechas del evento deben completarse');
      return false;
    }

    return true;
  };

  const validateStep2 = (): boolean => {
    if (!templateId) {
      toast.error('Debes seleccionar una plantilla para el evento');
      return false;
    }
    return true;
  };

  // Submit (solo en paso 3)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep1() || !validateStep2()) return;

    let registrationOpenAtIso: string;
    let registrationCloseAtIso: string;
    let schedulesIso: { start_datetime: string; end_datetime: string }[];

    try {
      registrationOpenAtIso = new Date(registrationOpenAt).toISOString();
      registrationCloseAtIso = new Date(registrationCloseAt).toISOString();
      schedulesIso = schedules.map((s) => ({
        start_datetime: new Date(s.start_datetime).toISOString(),
        end_datetime: new Date(s.end_datetime).toISOString(),
      }));
    } catch {
      toast.error('Hay fechas con formato inválido');
      return;
    }

    const participantsPayload = participants
      .filter((p) => p.national_id.trim() !== '')
      .map((p) => ({
        national_id: p.national_id.trim(),
        first_name: p.first_name ? p.first_name.trim() : undefined,
        last_name: p.last_name ? p.last_name.trim() : undefined,
        phone: p.phone ? p.phone.trim() : undefined,
        email: p.email ? p.email.trim() : undefined,
        registration_source: p.registration_source || undefined,
      }));

    setIsSubmitting(true);
    try {
      const body: CreateEventBody = {
        is_public: isPublic,
        code, // oficina (ej: OTIC) → backend genera EVT-YYYY-OTIC-0001
        certificate_series: certificateSeries,
        organizational_units_path: organizationalUnitsPath,
        title,
        description,
        template_id: templateId!,
        location,
        max_participants: maxParticipants === '' ? undefined : Number(maxParticipants) || undefined,
        registration_open_at: registrationOpenAtIso,
        registration_close_at: registrationCloseAtIso,
        status: 'SCHEDULED',
        schedules: schedulesIso,
        participants: participantsPayload.map((p) => ({
          national_id: p.national_id,
          first_name: p.first_name ?? '',
          last_name: p.last_name ?? '',
          phone: p.phone ?? '',
          email: p.email ?? '',
          registration_source: p.registration_source ?? 'SELF',
        })),
      };

      const result = await fn_create_event(body);

      toast.success(result.message);
      router.push('/main/events');
    } catch (err: any) {
      console.error(err);
      toast.error('Error al crear el evento', {
        description: err?.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI
  const goNext = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
    }
  };

  const goPrev = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));
  };

  return (
    <div className="space-y-6 p-6 ">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button type="button" onClick={() => router.back()} className="hover:bg-muted p-2 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h1 className="font-bold text-3xl">Registrar Nuevo Evento</h1>
          <p className="text-muted-foreground">Completa los pasos para crear un nuevo evento.</p>
        </div>
      </div>

      {/* Stepper */}
      {/* Stepper */}
      <div className="flex justify-center mb-6">
        <div className="flex w-full max-w-3xl items-center">
          {[
            { id: 1, title: 'Información del Evento', subtitle: 'Datos básicos y fechas' },
            { id: 2, title: 'Plantilla', subtitle: 'Documento asociado' },
            { id: 3, title: 'Participantes', subtitle: 'Registro opcional' },
          ].map((s, index, arr) => {
            const active = step === s.id;
            const completed = step > s.id;
            const isLast = index === arr.length - 1;

            return (
              <div key={s.id} className="flex flex-col items-center flex-1 relative">
                {/* Contenedor del Círculo y Línea */}
                <div className="relative flex items-center justify-center w-full">
                  {/* LÍNEA: Posición absoluta para no empujar el círculo */}
                  {!isLast && <div className="absolute left-[50%] top-1/2 w-full h-[2px] bg-border -translate-y-1/2 z-0" />}

                  {/* CÍRCULO: z-10 para asegurar que quede encima de la línea */}
                  <div
                    className={`relative z-10 flex justify-center items-center rounded-full w-9 h-9 text-sm font-semibold border-2 
              ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : completed
                  ? 'bg-primary/10 text-primary border-primary/10'
                  : 'bg-muted text-muted-foreground border-transparent'
              }`}
                  >
                    {s.id}
                  </div>
                </div>

                {/* TEXTO: Ahora se alineará perfectamente con el círculo */}
                <div className="mt-2 text-center">
                  <p className={`text-sm font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>{s.title}</p>
                  <p className="text-[11px] text-muted-foreground">{s.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-6 p-6 border-border">
          {step === 1 && (
            <>
              {/* Paso 1: datos del evento */}
              <div className="space-y-4">
                <h2 className="font-semibold text-lg">Información del Evento</h2>

                {/* Config general */}
                <div className="gap-4 grid md:grid-cols-3">
                  <div className="flex flex-col gap-2">
                    <Label>Oficina / Dependencia / Unidad Orgánica *</Label>
                    <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ej: OTIC" />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Serie de Certificado *</Label>
                    <Input value={certificateSeries} onChange={(e) => setCertificateSeries(e.target.value)} placeholder="Ej: CERT" />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Es público</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Switch checked={isPublic} onCheckedChange={(val) => setIsPublic(val)} />
                      <span className="text-xs text-muted-foreground">Visible para público general</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Ruta de Unidades Organizacionales *</Label>
                  <Input value={organizationalUnitsPath} onChange={(e) => setOrganizationalUnitsPath(e.target.value)} placeholder="Ej: GGR|OTIC" />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Título *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Curso de Transformación Digital" />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Descripción *</Label>
                  <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe los objetivos del evento..." />
                </div>

                <div className="gap-4 grid md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Ubicación *</Label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej: Auditorio Principal" />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Máx. participantes</Label>
                    <Input
                      type="number"
                      min={1}
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ej: 100"
                    />
                  </div>
                </div>

                {/* fechas de registro */}
                <div className="gap-4 grid md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Apertura de inscripción *</Label>
                    <Input type="datetime-local" value={registrationOpenAt} onChange={(e) => setRegistrationOpenAt(e.target.value)} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Cierre de inscripción *</Label>
                    <Input type="datetime-local" value={registrationCloseAt} onChange={(e) => setRegistrationCloseAt(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Schedules */}
              <div className="space-y-4 pt-6 border-t border-border">
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
            </>
          )}

          {step === 2 && (
            <>
              {/* Paso 2: plantilla */}
              <div className="space-y-4">
                <h2 className="font-semibold text-lg">Plantilla asociada</h2>

                <div className="flex flex-col gap-2">
                  <Label>Plantilla (certificado / documento) *</Label>
                  <Select
                    value={templateId ?? 'none'}
                    onOpenChange={(open) => open && handleLoadTemplates()}
                    onValueChange={async (value) => {
                      if (value === 'none') {
                        setTemplateId(null);
                        setMainPreview({
                          src: null,
                          kind: null,
                          loading: false,
                          error: null,
                        });
                        setAssociatedPreview({
                          src: null,
                          kind: null,
                          loading: false,
                          error: null,
                        });
                        return;
                      }

                      setTemplateId(value);
                      const tmpl = templates.find((t) => t.id === value);
                      await loadTemplatePreviews(tmpl);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una plantilla" />
                    </SelectTrigger>

                    <SelectContent>
                      {loadingTemplates ? (
                        <div className="flex justify-center items-center p-4 text-muted-foreground text-xs">
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Cargando...
                        </div>
                      ) : (
                        <>
                          <SelectItem value="none">Sin plantilla</SelectItem>
                          {templates.map((tmpl) => (
                            <SelectItem key={tmpl.id} value={tmpl.id}>
                              {tmpl.name} ({tmpl.code})
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Previews */}
                <div className="gap-4 grid md:grid-cols-2 md:h-[60vh]">
                  {/* PDF principal (file_id) */}
                  <div className="flex flex-col space-y-1 h-full">
                    <Label className="text-xs">Pantilla del documento</Label>
                    <div className="flex-1 bg-muted border border-dashed border-border rounded-md w-full overflow-hidden flex items-center justify-center">
                      {!templateId ? (
                        <p className="text-xs text-muted-foreground">Selecciona una plantilla para ver su PDF principal.</p>
                      ) : mainPreview.loading ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Cargando vista previa...</span>
                        </div>
                      ) : mainPreview.error ? (
                        <p className="text-xs text-muted-foreground">{mainPreview.error}</p>
                      ) : !mainPreview.src ? (
                        <p className="text-xs text-muted-foreground">No hay vista previa disponible.</p>
                      ) : mainPreview.kind === 'pdf' ? (
                        <iframe src={mainPreview.src} title="Vista previa PDF principal" className="w-full h-full" />
                      ) : mainPreview.kind === 'image' ? (
                        <Image src={mainPreview.src} alt="Vista previa plantilla principal" className="object-contain w-full h-full" />
                      ) : (
                        <p className="text-xs text-muted-foreground">Tipo de archivo no soportado.</p>
                      )}
                    </div>
                    {selectedTemplate?.file_id && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        file_id: <span className="font-mono">{selectedTemplate.file_id}</span>
                      </p>
                    )}
                  </div>

                  {/* PDF asociado (prev_file_id) */}
                  <div className="flex flex-col space-y-1 h-full">
                    <Label className="text-xs">Previsualización del documento</Label>
                    <div className="flex-1 bg-muted border border-dashed border-border rounded-md w-full overflow-hidden flex items-center justify-center">
                      {!templateId ? (
                        <p className="text-xs text-muted-foreground">Selecciona una plantilla para ver su PDF asociado.</p>
                      ) : associatedPreview.loading ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Cargando vista previa...</span>
                        </div>
                      ) : associatedPreview.error ? (
                        <p className="text-xs text-muted-foreground">{associatedPreview.error}</p>
                      ) : !associatedPreview.src ? (
                        <p className="text-xs text-muted-foreground">No hay vista previa disponible.</p>
                      ) : associatedPreview.kind === 'pdf' ? (
                        <iframe src={associatedPreview.src} title="Vista previa PDF asociado" className="w-full h-full" />
                      ) : associatedPreview.kind === 'image' ? (
                        <Image src={associatedPreview.src} alt="Vista previa asociada" className="object-contain w-full h-full" />
                      ) : (
                        <p className="text-xs text-muted-foreground">Tipo de archivo no soportado.</p>
                      )}
                    </div>
                    {selectedTemplate?.prev_file_id && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        prev_file_id: <span className="font-mono">{selectedTemplate.prev_file_id}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              {/* Paso 3: participantes */}
              <div className="space-y-4">
                <h2 className="font-semibold text-lg">Participantes (opcional)</h2>
                <p className="text-xs text-muted-foreground">Puedes registrar participantes desde ahora o dejar esta sección vacía y agregarlos más adelante.</p>

                {participants.length === 0 && (
                  <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">No hay participantes registrados aún.</div>
                )}

                {participants.map((p, idx) => (
                  <Card key={idx} className="space-y-3 p-4 border-border bg-muted/40">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold">Participante #{idx + 1}</span>
                      <Button type="button" variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => removeParticipant(idx)}>
                        <Trash2 className="w-3 h-3" />
                        Quitar
                      </Button>
                    </div>

                    <div className="gap-3 grid md:grid-cols-3">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">DNI *</Label>
                        <Input value={p.national_id} onChange={(e) => updateParticipant(idx, 'national_id', e.target.value)} placeholder="Ej: 12345678" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Nombre</Label>
                        <Input value={p.first_name} onChange={(e) => updateParticipant(idx, 'first_name', e.target.value)} placeholder="Ej: Juan" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Apellido</Label>
                        <Input value={p.last_name} onChange={(e) => updateParticipant(idx, 'last_name', e.target.value)} placeholder="Ej: Pérez" />
                      </div>
                    </div>

                    <div className="gap-3 grid md:grid-cols-3">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Teléfono</Label>
                        <Input value={p.phone} onChange={(e) => updateParticipant(idx, 'phone', e.target.value)} placeholder="Ej: 999999999" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Email</Label>
                        <Input type="email" value={p.email} onChange={(e) => updateParticipant(idx, 'email', e.target.value)} placeholder="juan.perez@example.com" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Origen de registro</Label>
                        <Select value={p.registration_source} onValueChange={(val) => updateParticipant(idx, 'registration_source', val)}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecciona origen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SELF">Autoregistro</SelectItem>
                            <SelectItem value="ADMIN">Registrado por admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}

                <Button type="button" variant="outline" className="gap-2" onClick={addParticipant}>
                  <Plus className="w-4 h-4" />
                  Agregar participante
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Navegación de pasos */}
        <div className="flex justify-between items-center">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={goPrev} disabled={step === 1}>
              Anterior
            </Button>

            {step < 3 ? (
              <Button type="button" onClick={goNext}>
                Siguiente
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Registrar evento
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
