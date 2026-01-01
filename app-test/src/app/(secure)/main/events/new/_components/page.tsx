/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import yaml from 'js-yaml';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { fn_get_document_templates, type DocumentTemplateItem } from '@/actions/fn-doc-template';
import { fn_create_event, type CreateEventBody } from '@/actions/fn-events';
import { fn_get_file_preview, type FilePreviewResult } from '@/actions/fn-file-preview';

import { NewEventHeader } from './new-event-header';
import { NewEventStepper } from './new-event-stepper';
import { NewEventStep1 } from './new-event-step1';
import { NewEventStep2 } from './new-event-step2';
import { NewEventStep3 } from './new-event-step3';
import { type Step, type ScheduleForm, type TemplatePreviewState, type ParticipantForm } from './new-event-types';

const NewEventPage: React.FC = () => {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);

  // plantillas
  const [templates, setTemplates] = useState<DocumentTemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // estado del formulario
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

  const [templateId, setTemplateId] = useState<string | null>(null);

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

  const [schedules, setSchedules] = useState<ScheduleForm[]>([{ start_datetime: '', end_datetime: '' }]);

  const [participants, setParticipants] = useState<ParticipantForm[]>([]);

  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasParticipants = participants.length > 0;

  const selectedTemplate = templates.find((t) => t.id === templateId) || null;

  const previewToShow = associatedPreview.src || associatedPreview.error ? associatedPreview : mainPreview;

  const previewFileId = (associatedPreview.src || associatedPreview.error) && selectedTemplate?.prev_file_id ? selectedTemplate.prev_file_id : selectedTemplate?.file_id;

  /* ---------------- helpers participantes ---------------- */

  const parseParticipantsFromData = (rows: any[]): ParticipantForm[] =>
    rows
      .map((row) => ({
        national_id: String(row.national_id ?? '').trim(),
        first_name: row.first_name ? String(row.first_name).trim() : '',
        last_name: row.last_name ? String(row.last_name).trim() : '',
        phone: row.phone ? String(row.phone).trim() : '',
        email: row.email ? String(row.email).trim() : '',
        registration_source: row.registration_source ? String(row.registration_source).trim() : 'SELF',
      }))
      .filter((p) => p.national_id !== '');

  const handleFileUpload = async (file: File | null): Promise<void> => {
    if (!file) return;

    setFileError(null);
    setIsParsingFile(true);
    setFileName(file.name);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let rows: any[] = [];

      if (ext === 'json') {
        const json = JSON.parse(await file.text());
        if (Array.isArray(json)) rows = json;
        else if (Array.isArray(json.participants)) rows = json.participants;
        else throw new Error('El JSON debe ser un arreglo de participantes o tener la clave "participants".');
      } else if (ext === 'yml' || ext === 'yaml') {
        const doc = yaml.load(await file.text());
        if (Array.isArray(doc)) rows = doc as any[];
        else if (doc && Array.isArray((doc as any).participants)) rows = (doc as any).participants;
        else throw new Error('El YAML debe ser un arreglo de participantes o tener la clave "participants".');
      } else if (ext === 'xlsx' || ext === 'xls') {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(sheet);
      } else if (ext === 'csv') {
        const text = await file.text();
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length < 2) {
          throw new Error('El CSV debe tener encabezados y al menos una fila de datos.');
        }

        const headers = lines[0].split(',').map((h) => h.trim());
        rows = lines.slice(1).map((line) => {
          const values = line.split(',');
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => {
            obj[h] = (values[i] ?? '').trim();
          });
          return obj;
        });
      } else {
        throw new Error('Formato no soportado. Usa .xlsx, .xls, .csv, .json, .yml o .yaml.');
      }

      const parsed = parseParticipantsFromData(rows);

      if (!parsed.length) {
        throw new Error('No se encontraron participantes válidos en el archivo.');
      }

      setParticipants(parsed);
    } catch (err: any) {
      console.error(err);
      setParticipants([]);
      setFileError(err?.message ?? 'Error al procesar el archivo.');
    } finally {
      setIsParsingFile(false);
    }
  };

  /* ---------------- plantillas ---------------- */

  const handleLoadTemplates = async (): Promise<void> => {
    if (templates.length > 0) return;

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

  const loadTemplatePreviews = async (tmpl: DocumentTemplateItem | undefined): Promise<void> => {
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

    if (!tmpl) return;

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

  const handleChangeTemplate = async (value: string): Promise<void> => {
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
  };

  /* ---------------- schedules ---------------- */

  const addSchedule = (): void => {
    setSchedules((prev) => [...prev, { start_datetime: '', end_datetime: '' }]);
  };

  const removeSchedule = (idx: number): void => {
    setSchedules((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSchedule = (idx: number, field: keyof ScheduleForm, value: string): void => {
    setSchedules((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  /* ---------------- validaciones ---------------- */

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

  /* ---------------- submit (solo al hacer clic) ---------------- */

  const handleSubmit = async (): Promise<void> => {
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
        first_name: p.first_name ? p.first_name.trim() : '',
        last_name: p.last_name ? p.last_name.trim() : '',
        phone: p.phone ? p.phone.trim() : '',
        email: p.email ? p.email.trim() : '',
        registration_source: p.registration_source || 'SELF',
      }));

    setIsSubmitting(true);
    try {
      const body: CreateEventBody = {
        is_public: isPublic,
        code,
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
        participants: participantsPayload,
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

  /* ---------------- navegación pasos ---------------- */

  const goNext = (): void => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
    }
  };

  const goPrev = (): void => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
  };

  return (
    <div className="space-y-6 p-6">
      <NewEventHeader onBack={() => router.back()} />
      <NewEventStepper step={step} />

      {/* form solo como contenedor, sin auto-submit */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <Card className="space-y-6 p-6 border-border rounded-md shadow-none">
          {step === 1 && (
            <NewEventStep1
              isPublic={isPublic}
              code={code}
              certificateSeries={certificateSeries}
              organizationalUnitsPath={organizationalUnitsPath}
              title={title}
              description={description}
              location={location}
              maxParticipants={maxParticipants}
              registrationOpenAt={registrationOpenAt}
              registrationCloseAt={registrationCloseAt}
              schedules={schedules}
              onChangeIsPublic={setIsPublic}
              onChangeCode={setCode}
              onChangeCertificateSeries={setCertificateSeries}
              onChangeOrgUnitsPath={setOrganizationalUnitsPath}
              onChangeTitle={setTitle}
              onChangeDescription={setDescription}
              onChangeLocation={setLocation}
              onChangeMaxParticipants={setMaxParticipants}
              onChangeRegistrationOpenAt={setRegistrationOpenAt}
              onChangeRegistrationCloseAt={setRegistrationCloseAt}
              onAddSchedule={addSchedule}
              onRemoveSchedule={removeSchedule}
              onUpdateSchedule={updateSchedule}
            />
          )}

          {step === 2 && (
            <NewEventStep2
              templates={templates}
              templateId={templateId}
              loadingTemplates={loadingTemplates}
              preview={previewToShow}
              previewFileId={previewFileId ?? null}
              onLoadTemplates={handleLoadTemplates}
              onChangeTemplate={(value) => {
                void handleChangeTemplate(value);
              }}
            />
          )}

          {step === 3 && (
            <NewEventStep3
              participants={participants}
              hasParticipants={hasParticipants}
              fileName={fileName}
              fileError={fileError}
              isParsingFile={isParsingFile}
              onSelectFile={(file) => {
                void handleFileUpload(file);
              }}
            />
          )}
        </Card>

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
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {hasParticipants ? 'Guardar' : 'Omitir y guardar'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewEventPage;
