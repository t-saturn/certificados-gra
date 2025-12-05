/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
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

// 🔹 Server actions: tipos / categorías / plantillas / eventos / preview
import { fn_get_document_types, type DocumentTypeItem } from '@/actions/fn-doc-type';
import { fn_get_document_categories, type DocumentCategoryItem } from '@/actions/fn-doc-category';
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

export default function Page() {
  const router = useRouter();

  // ------------------------------
  // Catálogos
  // ------------------------------
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeItem[]>([]);
  const [loadingDocTypes, setLoadingDocTypes] = useState(false);
  const [categories, setCategories] = useState<DocumentCategoryItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [templates, setTemplates] = useState<DocumentTemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // ------------------------------
  // Form state
  // ------------------------------
  const [isPublic, setIsPublic] = useState(true);
  const [code, setCode] = useState('');
  const [certificateSeries, setCertificateSeries] = useState('CERT');
  const [organizationalUnitsPath, setOrganizationalUnitsPath] = useState('GGR|OTIC');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [documentTypeId, setDocumentTypeId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');

  const [registrationOpenAt, setRegistrationOpenAt] = useState('');
  const [registrationCloseAt, setRegistrationCloseAt] = useState('');

  const [status, setStatus] = useState('SCHEDULED');

  // Template opcional (pero recomendado)
  const [templateId, setTemplateId] = useState<string | null>(null);

  // Vista previa del prev_file_id de la plantilla
  const [templatePreview, setTemplatePreview] = useState<TemplatePreviewState>({
    src: null,
    kind: null,
    loading: false,
    error: null,
  });

  // Schedule dinámico
  const [schedules, setSchedules] = useState<ScheduleForm[]>([{ start_datetime: '', end_datetime: '' }]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ------------------------------
  // Helpers
  // ------------------------------
  const selectedDocType = documentTypes.find((dt) => dt.id === documentTypeId) || null;
  const selectedCategory = categories.find((c) => c.id === categoryId) || null;
  const selectedTemplate = templates.find((t) => t.id === templateId) || null;

  // ------------------------------
  // Load Doc Types on mount
  // ------------------------------
  useEffect(() => {
    const loadDocTypes = async () => {
      setLoadingDocTypes(true);
      try {
        const result = await fn_get_document_types({
          page: 1,
          page_size: 50,
          is_active: true,
        });

        setDocumentTypes(result.items);

        if (!documentTypeId && result.items.length > 0) {
          setDocumentTypeId(result.items[0].id);
        }
      } catch (err: any) {
        console.error(err);
        toast.error('No se pudieron cargar los tipos de documento', {
          description: err?.message,
        });
      } finally {
        setLoadingDocTypes(false);
      }
    };

    void loadDocTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------
  // Load Categories when docType changes
  // ------------------------------
  useEffect(() => {
    if (!selectedDocType) {
      setCategories([]);
      setCategoryId(null);
      return;
    }

    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const result = await fn_get_document_categories({
          page: 1,
          page_size: 50,
          is_active: true,
          doc_type_code: selectedDocType.code,
        });

        setCategories(result.items);
        setCategoryId(null); // por defecto: todas
      } catch (err: any) {
        console.error(err);
        toast.error('No se pudieron cargar las categorías', {
          description: err?.message,
        });
      } finally {
        setLoadingCategories(false);
      }
    };

    void loadCategories();
  }, [selectedDocType?.code]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------
  // Load Templates on demand (en función de tipo + categoría)
  // ------------------------------
  const handleLoadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const result = await fn_get_document_templates({
        page: 1,
        page_size: 50,
        is_active: true,
        template_type_code: selectedDocType?.code,
        template_category_code: selectedCategory?.code,
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

  // ------------------------------
  // Preview de la plantilla seleccionada (prev_file_id)
  // ------------------------------
  const loadTemplatePreview = async (prevFileId: string | null | undefined) => {
    if (!prevFileId) {
      setTemplatePreview({
        src: null,
        kind: null,
        loading: false,
        error: 'La plantilla seleccionada no tiene un PDF asociado (prev_file_id).',
      });
      return;
    }

    setTemplatePreview({
      src: null,
      kind: null,
      loading: true,
      error: null,
    });

    try {
      const result: FilePreviewResult = await fn_get_file_preview(prevFileId);

      if (result.kind === 'pdf' || result.kind === 'image') {
        setTemplatePreview({
          src: result.url,
          kind: result.kind,
          loading: false,
          error: null,
        });
      } else {
        setTemplatePreview({
          src: null,
          kind: result.kind,
          loading: false,
          error: 'Tipo de archivo no soportado, se esperaba PDF o imagen.',
        });
      }
    } catch (err: any) {
      console.error(err);
      setTemplatePreview({
        src: null,
        kind: null,
        loading: false,
        error: err?.message ?? 'Error al obtener la vista previa de la plantilla.',
      });
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

  const updateSchedule = (idx: number, field: keyof ScheduleForm, value: string) => {
    const updated = [...schedules];
    updated[idx] = { ...updated[idx], [field]: value };
    setSchedules(updated);
  };

  // ------------------------------
  // Submit
  // ------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) return toast.error('El código del evento es obligatorio');
    if (!certificateSeries.trim()) return toast.error('La serie de certificados es obligatoria');
    if (!organizationalUnitsPath.trim()) return toast.error('La ruta de unidades organizacionales es obligatoria');

    if (!title.trim()) return toast.error('El título es obligatorio');
    if (!description.trim()) return toast.error('La descripción es obligatoria');
    if (!documentTypeId) return toast.error('Debes seleccionar un tipo de documento');
    if (!location.trim()) return toast.error('La ubicación es obligatoria');

    if (!registrationOpenAt) return toast.error('La fecha de apertura de inscripciones es obligatoria');
    if (!registrationCloseAt) return toast.error('La fecha de cierre de inscripciones es obligatoria');

    if (!templateId) return toast.error('Debes seleccionar una plantilla para el evento');

    const invalid = schedules.some((s) => !s.start_datetime.trim() || !s.end_datetime.trim());
    if (invalid) return toast.error('Todas las fechas del evento deben completarse');

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
      return toast.error('Hay fechas con formato inválido');
    }

    setIsSubmitting(true);
    try {
      const body: CreateEventBody = {
        is_public: isPublic,
        code,
        certificate_series: certificateSeries,
        organizational_units_path: organizationalUnitsPath,
        title,
        description,
        template_id: templateId,
        location,
        max_participants: maxParticipants === '' ? undefined : Number(maxParticipants) || undefined,
        registration_open_at: registrationOpenAtIso,
        registration_close_at: registrationCloseAtIso,
        status,
        schedules: schedulesIso,
        participants: [], // por ahora no registramos participantes desde esta pantalla
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
          {/* Config general */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Configuración General</h2>

            <div className="gap-4 grid md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label>Código *</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ej: EVT-2025-OTIC-01" />
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
          </div>

          {/* Información del evento */}
          <div className="space-y-4 pt-6 border-t border-border">
            <h2 className="font-semibold text-lg">Información del Evento</h2>

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
                <Label>Tipo de Documento *</Label>
                <Select value={documentTypeId} onValueChange={(value) => setDocumentTypeId(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingDocTypes ? 'Cargando tipos...' : 'Selecciona un tipo'} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingDocTypes ? (
                      <div className="flex items-center justify-center p-2 text-xs text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cargando...
                      </div>
                    ) : (
                      documentTypes.map((dt) => (
                        <SelectItem key={dt.id} value={dt.id}>
                          {dt.name} ({dt.code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Categoría (para filtrar plantillas)</Label>
                <Select
                  value={categoryId ? String(categoryId) : 'all'}
                  onValueChange={(value) => {
                    if (value === 'all') setCategoryId(null);
                    else setCategoryId(Number(value));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCategories ? 'Cargando categorías...' : 'Todas'} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingCategories ? (
                      <div className="flex items-center justify-center p-2 text-xs text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cargando...
                      </div>
                    ) : (
                      <>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            {cat.name} ({cat.code})
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
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

            {/* estado */}
            <div className="flex flex-col gap-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">Programado</SelectItem>
                  <SelectItem value="CANCELLED">Cancelado</SelectItem>
                  <SelectItem value="COMPLETED">Completado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Plantilla */}
            <div className="flex flex-col gap-2">
              <Label>Plantilla (certificado / documento)</Label>
              <Select
                value={templateId ?? 'none'}
                onOpenChange={(open) => open && handleLoadTemplates()}
                onValueChange={async (value) => {
                  if (value === 'none') {
                    setTemplateId(null);
                    setTemplatePreview({
                      src: null,
                      kind: null,
                      loading: false,
                      error: null,
                    });
                    return;
                  }

                  setTemplateId(value);
                  const tmpl = templates.find((t) => t.id === value);
                  await loadTemplatePreview(tmpl?.prev_file_id);
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

              {/* Vista previa del PDF asociado */}
              <div className="mt-3 space-y-1">
                <Label className="text-xs">Vista previa de la plantilla (PDF asociado)</Label>
                <div className="bg-muted border border-dashed border-border rounded-md w-full h-64 overflow-hidden flex items-center justify-center">
                  {!templateId ? (
                    <p className="text-xs text-muted-foreground">Selecciona una plantilla para ver su PDF asociado.</p>
                  ) : templatePreview.loading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cargando vista previa...</span>
                    </div>
                  ) : templatePreview.error ? (
                    <p className="text-xs text-muted-foreground">{templatePreview.error}</p>
                  ) : !templatePreview.src ? (
                    <p className="text-xs text-muted-foreground">No hay vista previa disponible para esta plantilla.</p>
                  ) : templatePreview.kind === 'pdf' ? (
                    <iframe src={templatePreview.src} title="Vista previa PDF" className="w-full h-full" />
                  ) : templatePreview.kind === 'image' ? (
                    // por si algún día usas imagen como prev_file_id
                    <Image src={templatePreview.src} alt="Vista previa plantilla" fill className="object-contain" />
                  ) : (
                    <p className="text-xs text-muted-foreground">Tipo de archivo no soportado para previsualización.</p>
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
