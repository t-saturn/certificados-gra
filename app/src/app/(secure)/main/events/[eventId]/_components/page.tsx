/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import type { DragEvent } from 'react';
import { useRef } from 'react';

import * as XLSX from 'xlsx';
import yaml from 'js-yaml';

import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ArrowLeft, FileText, Users, Clock, Loader2, Trash2, Plus, Search, FileBadge, Pencil } from 'lucide-react';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

import type { EventDetailResult } from '@/actions/fn-event-detail';
import type { EventParticipant, EventSchedule, UpdateEventParticipantPatchItem, UpdateEventBody } from '@/actions/fn-events';
import { fn_get_event_by_id, fn_update_event, fn_update_event_participants } from '@/actions/fn-events';
import { fn_event_action } from '@/actions/fn-event-actions';

export interface EventDetailPageProps {
  event: EventDetailResult;
}

/* ----------------- Helpers ----------------- */

const formatDateTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
};

// Extrae "YYYY-MM-DDTHH:mm" del ISO del backend SIN usar new Date()
const toLocalInputValue = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const m = iso.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  return m ? m[1] : '';
};

// Calcula el offset local actual en formato ±HH:MM (ej: -05:00)
const getLocalOffset = (): string => {
  const offsetMinutes = new Date().getTimezoneOffset(); // ej: 300 para -05:00
  const sign = offsetMinutes > 0 ? '-' : '+';
  const abs = Math.max(Math.abs(offsetMinutes), 0);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
};

// Convierte el valor del input datetime-local a string para el backend
// Ej: "2025-10-10T08:00" => "2025-10-10T08:00:00-05:00"
const fromLocalInputToServer = (value: string): string | null => {
  if (!value) return null;
  const offset = getLocalOffset();
  return `${value}:00${offset}`;
};

/* ----------------- Tipos UI ----------------- */

type EditableParticipant = EventParticipant & {
  full_name?: string;
  user_detail_id?: string;
  _isNew?: boolean;
  _deleted?: boolean;
};

type EditableSchedule = {
  id?: string;
  start: string; // datetime-local
  end: string; // datetime-local
};

type CertLabel = 'NINGUNO' | 'PENDIENTE' | 'CREADO' | 'RECHAZADO';

const EventDetailPage: FC<EventDetailPageProps> = ({ event }) => {
  const router = useRouter();

  const schedules: EventSchedule[] = event.schedules ?? [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const originalParticipants: EditableParticipant[] = (event.participants ?? []) as EditableParticipant[];

  const documentTypeName = event.template?.document_type_name ?? '—';

  const [eventDocuments, setEventDocuments] = useState<any[]>(() => (event.documents ?? []) as any[]);
  const [, setRefreshingEvent] = useState(false);

  const refreshEventDocuments = async (): Promise<void> => {
    try {
      setRefreshingEvent(true);
      const fresh = await fn_get_event_by_id(event.id);
      setEventDocuments((fresh as any).documents ?? []);
    } catch (e) {
      // opcional: toast aquí
      console.error('[refreshEventDocuments]', e);
    } finally {
      setRefreshingEvent(false);
    }
  };

  /* ----------------- Tipado "documents" y map de status ----------------- */

  const getCertificateLabel = (rawStatus?: string): CertLabel => {
    if (!rawStatus) return 'NINGUNO';

    const s = String(rawStatus).toUpperCase();
    if (s === 'REJECTED') return 'RECHAZADO';
    if (s === 'CREATED') return 'CREADO';
    if (s === 'GENERATED') return 'PENDIENTE';

    return 'PENDIENTE';
  };

  const certBadgeClass = (label: CertLabel): string => {
    switch (label) {
      case 'CREADO':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'RECHAZADO':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      case 'PENDIENTE':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'NINGUNO':
      default:
        return 'border-gray-200 bg-gray-50 text-gray-700';
    }
  };

  const documentsByUserDetailId = useMemo(() => {
    const map = new Map<string, { status: string }>();
    (eventDocuments ?? []).forEach((d: any) => {
      if (d?.user_detail_id) map.set(d.user_detail_id, { status: d.status });
    });
    return map;
  }, [eventDocuments]);

  /* ----------------- TAB: Información principal (editable) ----------------- */

  const [savingEvent, setSavingEvent] = useState(false);

  const [eventForm, setEventForm] = useState({
    title: event.title,
    description: event.description ?? '',
    location: event.location ?? '',
    max_participants: event.max_participants ? String(event.max_participants) : '',
    registration_open_at: toLocalInputValue(event.registration_open_at),
    registration_close_at: toLocalInputValue(event.registration_close_at),
  });

  const [eventSchedules, setEventSchedules] = useState<EditableSchedule[]>(
    schedules.length
      ? schedules.map((s) => ({
          id: (s as any).id,
          start: toLocalInputValue(s.start_datetime),
          end: toLocalInputValue(s.end_datetime),
        }))
      : [{ start: '', end: '' }],
  );

  const handleChangeEventField = (field: keyof typeof eventForm, value: string): void => {
    setEventForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangeSchedule = (idx: number, field: 'start' | 'end', value: string): void => {
    setEventSchedules((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleAddScheduleRow = (): void => {
    setEventSchedules((prev) => [...prev, { start: '', end: '' }]);
  };

  const handleRemoveScheduleRow = (idx: number): void => {
    setEventSchedules((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveEventInfo = async (): Promise<void> => {
    if (!eventForm.title.trim()) {
      toast.error('El título del evento es obligatorio');
      return;
    }

    if (!eventForm.registration_open_at || !eventForm.registration_close_at) {
      toast.error('Las fechas de apertura y cierre de inscripción son obligatorias');
      return;
    }

    const invalidSchedule = eventSchedules.some((s) => !s.start || !s.end);
    if (invalidSchedule) {
      toast.error('Todas las fechas / horarios del evento deben estar completas');
      return;
    }

    const body: UpdateEventBody = {};

    // Campos simples
    if (eventForm.title.trim() !== event.title) body.title = eventForm.title.trim();

    const originalDesc = event.description ?? '';
    if (eventForm.description.trim() !== originalDesc) body.description = eventForm.description.trim() || null;

    const originalLoc = event.location ?? '';
    if (eventForm.location.trim() !== originalLoc) body.location = eventForm.location.trim() || '';

    const originalMax = event.max_participants ?? null;
    const newMax = eventForm.max_participants ? Number(eventForm.max_participants) : null;
    const normalizedNewMax = Number.isNaN(newMax) ? null : newMax;

    if (normalizedNewMax !== originalMax) body.max_participants = normalizedNewMax;

    // Fechas inscripción (comparación local)
    const originalOpenLocal = toLocalInputValue(event.registration_open_at);
    const originalCloseLocal = toLocalInputValue(event.registration_close_at);

    const registrationChanged = eventForm.registration_open_at !== originalOpenLocal || eventForm.registration_close_at !== originalCloseLocal;

    if (registrationChanged) {
      const openStr = fromLocalInputToServer(eventForm.registration_open_at);
      const closeStr = fromLocalInputToServer(eventForm.registration_close_at);

      if (!openStr || !closeStr) {
        toast.error('Hay fechas de inscripción con formato inválido');
        return;
      }

      body.registration_open_at = openStr;
      body.registration_close_at = closeStr;
    }

    // Schedules
    const originalSchedulesLocal: EditableSchedule[] = (event.schedules ?? []).map((s) => ({
      start: toLocalInputValue(s.start_datetime),
      end: toLocalInputValue(s.end_datetime),
    }));

    const schedulesChanged = (() => {
      if (originalSchedulesLocal.length !== eventSchedules.length) return true;
      for (let i = 0; i < eventSchedules.length; i++) {
        const curr = eventSchedules[i];
        const orig = originalSchedulesLocal[i];
        if (!orig) return true;
        if (curr.start !== orig.start || curr.end !== orig.end) return true;
      }
      return false;
    })();

    if (schedulesChanged) {
      const schedulesIso = eventSchedules.map((s) => {
        const startStr = fromLocalInputToServer(s.start);
        const endStr = fromLocalInputToServer(s.end);
        if (!startStr || !endStr) throw new Error('Fechas inválidas');
        return { start_datetime: startStr, end_datetime: endStr };
      });

      body.schedules = schedulesIso;
    }

    if (Object.keys(body).length === 0) {
      toast.info('No hay cambios en la información del evento');
      return;
    }

    try {
      setSavingEvent(true);
      const result = await fn_update_event(event.id, body);
      toast.success(result.message || 'Evento actualizado correctamente');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error('No se pudo actualizar la información del evento', { description: err?.message });
    } finally {
      setSavingEvent(false);
    }
  };

  /* ----------------- TAB: Participantes (CRUD) ----------------- */

  const [editableParticipants, setEditableParticipants] = useState<EditableParticipant[]>(originalParticipants);
  const [savingParticipants, setSavingParticipants] = useState(false);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ national_id: string; first_name: string; last_name: string; email: string; phone: string }>({
    national_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const originalByDni = useMemo(() => {
    const map = new Map<string, EditableParticipant>();
    originalParticipants.forEach((p) => map.set(p.national_id, p));
    return map;
  }, [originalParticipants]);

  const openEditModal = (idx: number): void => {
    const p = editableParticipants[idx];
    setEditForm({
      national_id: p.national_id,
      first_name: p.first_name ?? '',
      last_name: p.last_name ?? '',
      email: p.email ?? '',
      phone: p.phone ?? '',
    });
    setEditingIndex(idx);
  };

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);

  type ImportParticipantRow = {
    national_id: string;
    first_name: string;
    last_name: string;
    phone?: string;
    email?: string;
  };

  const normalizeImportedRow = (row: any): ImportParticipantRow | null => {
    if (!row) return null;

    const national_id = String(row.national_id ?? row.NATIONAL_ID ?? row.dni ?? row.DNI ?? '').trim();
    const first_name = String(row.first_name ?? row.FIRST_NAME ?? row.nombre ?? row.NOMBRE ?? '').trim();
    const last_name = String(row.last_name ?? row.LAST_NAME ?? row.apellido ?? row.APELLIDO ?? '').trim();
    const phone = row.phone ?? row.PHONE ?? row.telefono ?? row.TELEFONO;
    const email = row.email ?? row.EMAIL;

    if (!national_id) return null;

    return {
      national_id,
      first_name,
      last_name,
      phone: phone ? String(phone).trim() : '',
      email: email ? String(email).trim() : '',
    };
  };

  const mergeImportedParticipants = (rows: ImportParticipantRow[]): void => {
    setEditableParticipants((prev) => {
      const existingDni = new Set(prev.filter((p) => !p._deleted).map((p) => p.national_id));
      const next = [...prev];

      rows.forEach((r) => {
        if (!r.national_id) return;

        // si ya existe, lo saltamos (no sobreescribimos)
        if (existingDni.has(r.national_id)) return;

        next.push({
          national_id: r.national_id,
          first_name: r.first_name ?? '',
          last_name: r.last_name ?? '',
          phone: r.phone ?? '',
          email: r.email ?? '',
          registration_source: 'IMPORTED',
          _isNew: true,
        });
        existingDni.add(r.national_id);
      });

      return next;
    });
  };

  const parseFileToRows = async (file: File): Promise<ImportParticipantRow[]> => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    // XLSX/XLS
    if (ext === 'xlsx' || ext === 'xls') {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      return json.map(normalizeImportedRow).filter(Boolean) as ImportParticipantRow[];
    }

    // CSV
    if (ext === 'csv') {
      const text = await file.text();
      const wb = XLSX.read(text, { type: 'string' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      return json.map(normalizeImportedRow).filter(Boolean) as ImportParticipantRow[];
    }

    // JSON
    if (ext === 'json') {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.participants) ? parsed.participants : [];
      return arr.map(normalizeImportedRow).filter(Boolean) as ImportParticipantRow[];
    }

    // YAML
    if (ext === 'yml' || ext === 'yaml') {
      const text = await file.text();
      const parsed: any = yaml.load(text);
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.participants) ? parsed.participants : [];
      return arr.map(normalizeImportedRow).filter(Boolean) as ImportParticipantRow[];
    }

    throw new Error('Formato no soportado. Usa .xlsx/.xls/.csv/.json/.yml/.yaml');
  };

  const handleSelectImportFile = async (file: File): Promise<void> => {
    setImportError(null);
    setImportFileName(file.name);

    try {
      setIsParsingFile(true);

      const rows = await parseFileToRows(file);

      if (!rows.length) {
        setImportError('No se detectaron filas válidas. Verifica los encabezados (national_id, first_name, last_name, phone, email).');
        return;
      }

      mergeImportedParticipants(rows);
      toast.success(`Importados ${rows.length} participante(s)`);
    } catch (e: any) {
      console.error('[handleSelectImportFile]', e);
      setImportError(e?.message ?? 'No se pudo procesar el archivo');
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    void handleSelectImportFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleClickDropzone = (): void => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    void handleSelectImportFile(file);
    e.target.value = ''; // permite re-subir el mismo archivo
  };

  const closeEditModal = (): void => setEditingIndex(null);

  const openDeleteModal = (idx: number): void => setDeleteIndex(idx);

  const closeDeleteModal = (): void => setDeleteIndex(null);

  const handleSaveEditParticipant = (): void => {
    if (editingIndex === null) return;

    setEditableParticipants((prev) => {
      const copy = [...prev];
      const target = copy[editingIndex];

      copy[editingIndex] = {
        ...target,
        national_id: target._isNew ? editForm.national_id.trim() : target.national_id,
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
      };

      return copy;
    });

    closeEditModal();
  };

  const handleConfirmDeleteParticipant = (): void => {
    if (deleteIndex === null) return;

    setEditableParticipants((prev) => {
      const copy = [...prev];
      copy[deleteIndex] = { ...copy[deleteIndex], _deleted: true };
      return copy;
    });

    closeDeleteModal();
  };

  const handleAddParticipantRow = (): void => {
    setEditableParticipants((prev) => [...prev, { national_id: '', first_name: '', last_name: '', email: '', phone: '', registration_source: 'IMPORTED', _isNew: true }]);
  };

  const handleSaveParticipants = async (): Promise<void> => {
    const patches: UpdateEventParticipantPatchItem[] = [];

    editableParticipants.forEach((p) => {
      const original = originalByDni.get(p.national_id);

      if (p._deleted) {
        if (original) patches.push({ national_id: original.national_id, remove: true });
        return;
      }

      if (p._isNew) {
        if (!p.national_id.trim()) return;

        patches.push({
          national_id: p.national_id.trim(),
          first_name: p.first_name?.trim() || undefined,
          last_name: p.last_name?.trim() || undefined,
          phone: p.phone?.trim() || undefined,
          email: p.email?.trim() || undefined,
          registration_source: p.registration_source || 'IMPORTED',
        });
        return;
      }

      if (original) {
        const changed = p.first_name !== original.first_name || p.last_name !== original.last_name || (p.phone ?? '') !== (original.phone ?? '') || (p.email ?? '') !== (original.email ?? '');

        if (!changed) return;

        patches.push({
          national_id: p.national_id,
          first_name: p.first_name,
          last_name: p.last_name,
          phone: p.phone ?? null,
          email: p.email ?? null,
        });
      }
    });

    if (patches.length === 0) {
      toast.info('No hay cambios en participantes para guardar');
      return;
    }

    try {
      setSavingParticipants(true);
      await fn_update_event_participants(event.id, { participants: patches });
      toast.success('Participantes actualizados correctamente');
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error('No se pudieron actualizar los participantes', { description: error?.message });
    } finally {
      setSavingParticipants(false);
    }
  };

  /* ----------------- TAB: Certificados ----------------- */

  const [certSearch, setCertSearch] = useState('');
  const [selectedForCert, setSelectedForCert] = useState<Set<string>>(new Set());
  const [runningEventAction, setRunningEventAction] = useState(false);

  const visibleParticipants = editableParticipants.filter((p) => !p._deleted);

  const filteredForCert = useMemo(() => {
    if (!certSearch.trim()) return visibleParticipants;
    const term = certSearch.trim().toLowerCase();
    return visibleParticipants.filter((p) => {
      const fullName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase();
      return p.national_id.toLowerCase().includes(term) || fullName.includes(term) || (p.email ?? '').toLowerCase().includes(term);
    });
  }, [certSearch, visibleParticipants]);

  // DNI -> user_detail_id (para enviar al backend en firmar/rechazar)
  const userDetailIdByDni = useMemo(() => {
    const map = new Map<string, string>();
    visibleParticipants.forEach((p) => {
      const udid = (p as any).user_detail_id as string | undefined;
      if (udid) map.set(p.national_id, udid);
    });
    return map;
  }, [visibleParticipants]);

  const selectedUserDetailIds = useMemo(() => {
    const ids: string[] = [];
    selectedForCert.forEach((dni) => {
      const udid = userDetailIdByDni.get(dni);
      if (udid) ids.push(udid);
    });
    return ids;
  }, [selectedForCert, userDetailIdByDni]);

  const certStatusLabelFor = (p: EditableParticipant): CertLabel => {
    const udid = (p as any).user_detail_id as string | undefined;
    const doc = udid ? documentsByUserDetailId.get(udid) : undefined;
    return getCertificateLabel(doc?.status);
  };

  // Si hay al menos 1 PENDIENTE => se muestra "Generar certificados" (sin selección)
  const hasAnyPending = useMemo(() => {
    return filteredForCert.some((p) => {
      const s = certStatusLabelFor(p);
      return s === 'PENDIENTE' || s === 'NINGUNO';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredForCert, documentsByUserDetailId]);

  // Selección solo se habilita cuando NO hay pendientes (para firmar / rechazar)
  const canSelectRows = !hasAnyPending;

  const toggleSelectAllCert = (checked: boolean): void => {
    if (!canSelectRows) return;

    if (checked) {
      const next = new Set<string>();
      filteredForCert.forEach((p) => next.add(p.national_id));
      setSelectedForCert(next);
    } else {
      setSelectedForCert(new Set());
    }
  };

  const toggleSelectCert = (dni: string, checked: boolean): void => {
    if (!canSelectRows) return;

    setSelectedForCert((prev) => {
      const next = new Set(prev);
      if (checked) next.add(dni);
      else next.delete(dni);
      return next;
    });
  };

  const runEventAction = async (action: 'generate_certificates' | 'sign_certificates' | 'rejected_certificates', participantsId?: string[]): Promise<void> => {
    try {
      setRunningEventAction(true);

      const resp = await fn_event_action(event.id, action, participantsId);

      const label = action === 'generate_certificates' ? 'Certificados generados' : action === 'sign_certificates' ? 'Certificados firmados' : 'Certificados rechazados';

      toast.success(label, {
        description: `created: ${resp.result.created} · skipped: ${resp.result.skipped} · updated: ${resp.result.updated}`,
      });

      // limpiar selección siempre
      setSelectedForCert(new Set());

      // refresca documents para que la tabla actualice sin F5
      await refreshEventDocuments();

      router.refresh(); // opcional (puedes dejarlo)
    } catch (err: any) {
      console.error(err);
      toast.error('No se pudo ejecutar la acción', { description: err?.message });
    } finally {
      setRunningEventAction(false);
    }
  };

  const handlePrimaryCertificatesAction = async (): Promise<void> => {
    // 1) Si hay pendientes => GENERAR para todos (sin selección)
    if (hasAnyPending) {
      await runEventAction('generate_certificates'); // participantsId undefined => a todos
      return;
    }

    // 2) Si NO hay pendientes => FIRMAR requiere selección
    if (selectedUserDetailIds.length === 0) {
      toast.info('Selecciona al menos un participante para firmar');
      return;
    }

    await runEventAction('sign_certificates', selectedUserDetailIds);
  };

  const handleRejectCertificates = async (): Promise<void> => {
    // Si está en modo "generar", no tiene sentido "rechazar" todavía
    if (hasAnyPending) {
      toast.info('Primero genera certificados. Luego podrás rechazar por selección.');
      return;
    }

    if (selectedUserDetailIds.length === 0) {
      toast.info('Selecciona al menos un participante para rechazar');
      return;
    }

    await runEventAction('rejected_certificates', selectedUserDetailIds);
  };

  /* ----------------- Render ----------------- */

  return (
    <section className="flex flex-col gap-6 p-4">
      {/* Header */}
      <header className="flex items-center gap-4">
        <button type="button" onClick={() => router.back()} className="rounded-lg p-2 transition-colors hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px] uppercase">
              {event.status}
            </Badge>

            <Badge variant="outline" className="text-[10px]">
              {documentTypeName}
            </Badge>

            <span>
              Creado: <strong>{formatDateTime(event.created_at)}</strong>
            </span>
            <span>
              Actualizado: <strong>{formatDateTime(event.updated_at)}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general" className="text-xs sm:text-sm">
            Información principal
          </TabsTrigger>
          <TabsTrigger value="participants" className="text-xs sm:text-sm">
            Participantes ({visibleParticipants.length})
          </TabsTrigger>
          <TabsTrigger value="certificates" className="text-xs sm:text-sm">
            Certificados
          </TabsTrigger>
        </TabsList>

        {/* TAB: Información principal (editable) */}
        <TabsContent value="general" className="space-y-4">
          {/* Datos principales */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4" />
                  <span>Datos del evento</span>
                </div>
                <Button size="sm" className="gap-2" onClick={handleSaveEventInfo} disabled={savingEvent}>
                  {savingEvent && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar cambios
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={eventForm.title} onChange={(e) => handleChangeEventField('title', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea rows={3} value={eventForm.description} onChange={(e) => handleChangeEventField('description', e.target.value)} placeholder="Describe brevemente el objetivo del evento…" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ubicación</Label>
                  <Input value={eventForm.location} onChange={(e) => handleChangeEventField('location', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Máx. participantes</Label>
                  <Input type="number" min={1} value={eventForm.max_participants} onChange={(e) => handleChangeEventField('max_participants', e.target.value)} placeholder="Ej: 100" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Apertura de inscripción *</Label>
                  <Input type="datetime-local" value={eventForm.registration_open_at} onChange={(e) => handleChangeEventField('registration_open_at', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cierre de inscripción *</Label>
                  <Input type="datetime-local" value={eventForm.registration_close_at} onChange={(e) => handleChangeEventField('registration_close_at', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fechas / horarios del evento */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4" />
                  <span>Fechas / Horarios del evento</span>
                </div>

                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={handleAddScheduleRow}>
                  <Plus className="h-3 w-3" />
                  Agregar sesión
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {eventSchedules.length === 0 ? (
                <p>No hay sesiones configuradas.</p>
              ) : (
                <div className="space-y-3">
                  {eventSchedules.map((s, idx) => (
                    <div key={idx} className="grid gap-3 md:grid-cols-[1fr,1fr,auto] items-end">
                      <div className="space-y-2">
                        <Label>Inicio *</Label>
                        <Input type="datetime-local" value={s.start} onChange={(e) => handleChangeSchedule(idx, 'start', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Fin *</Label>
                        <Input type="datetime-local" value={s.end} onChange={(e) => handleChangeSchedule(idx, 'end', e.target.value)} />
                      </div>
                      <div className="flex justify-end">
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => handleRemoveScheduleRow(idx)} disabled={eventSchedules.length <= 1}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants">
          <Card>
            {/* HEADER: título + botones */}
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <div>
                    <p className="text-sm font-semibold">Participantes</p>
                    <p className="text-xs text-muted-foreground">Total filas (incl. nuevas): {visibleParticipants.length}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={handleAddParticipantRow}>
                    <Plus className="h-3 w-3" />
                    Agregar participante
                  </Button>

                  <Button type="button" size="sm" className="gap-2" onClick={handleSaveParticipants} disabled={savingParticipants}>
                    {savingParticipants && <Loader2 className="h-4 w-4 animate-spin" />}
                    Guardar cambios
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* IMPORT: Dropzone */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Importar participantes</Label>

                  {importFileName && (
                    <p className="text-xs text-muted-foreground">
                      Archivo: <span className="font-medium">{importFileName}</span>
                    </p>
                  )}
                </div>

                <div
                  onClick={handleClickDropzone}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`flex flex-col items-center justify-center rounded-md border border-dashed p-4 text-xs cursor-pointer transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/40 hover:bg-muted'}`}
                >
                  <p className="mb-1 font-medium">Arrastra y suelta el archivo aquí</p>
                  <p className="text-muted-foreground">o haz clic para buscar en tu equipo</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Formatos: <span className="font-mono">.xlsx, .xls, .csv, .json, .yml, .yaml</span>
                  </p>
                </div>

                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.json,.yml,.yaml" onChange={handleInputChange} className="hidden" />

                {isParsingFile && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Procesando archivo…</span>
                  </div>
                )}

                {importError && <p className="text-xs text-destructive">{importError}</p>}
              </div>

              {/* TABLA */}
              {visibleParticipants.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
                  No hay participantes registrados. Puedes agregar nuevos con el botón &quot;Agregar participante&quot;.
                </div>
              ) : (
                <div className="max-h-[420px] overflow-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">DNI</th>
                        <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                        <th className="px-3 py-2 text-left font-semibold">Apellido</th>
                        <th className="px-3 py-2 text-left font-semibold">Email</th>
                        <th className="px-3 py-2 text-left font-semibold">Teléfono</th>
                        <th className="px-3 py-2 text-left font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableParticipants.map((p, idx) => {
                        if (p._deleted) return null;

                        return (
                          <tr key={`${p.national_id}-${idx}`} className="border-t">
                            <td className="px-3 py-1 font-mono">{p.national_id || <span className="text-muted-foreground">—</span>}</td>
                            <td className="px-3 py-1">{p.first_name || '—'}</td>
                            <td className="px-3 py-1">{p.last_name || '—'}</td>
                            <td className="px-3 py-1">{p.email || '—'}</td>
                            <td className="px-3 py-1">{p.phone || '—'}</td>
                            <td className="px-3 py-1">
                              <div className="flex gap-1">
                                <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => openEditModal(idx)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>

                                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => openDeleteModal(idx)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modales quedan igual */}
          {/* Modal EDITAR participante */}
          <Dialog
            open={editingIndex !== null}
            onOpenChange={(open) => {
              if (!open) closeEditModal();
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar participante</DialogTitle>
                <DialogDescription className="text-xs">Ajusta los datos del participante. El DNI solo puede modificarse para participantes nuevos.</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Label>DNI</Label>
                    <Input
                      value={editForm.national_id}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, national_id: e.target.value }))}
                      disabled={editingIndex !== null && !editableParticipants[editingIndex]?._isNew}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label>Nombre</Label>
                    <Input value={editForm.first_name} onChange={(e) => setEditForm((prev) => ({ ...prev, first_name: e.target.value }))} />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label>Apellido</Label>
                    <Input value={editForm.last_name} onChange={(e) => setEditForm((prev) => ({ ...prev, last_name: e.target.value }))} />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label>Email</Label>
                    <Input value={editForm.email} onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))} />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label>Teléfono</Label>
                    <Input value={editForm.phone} onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))} />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeEditModal}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEditParticipant}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={deleteIndex !== null}
            onOpenChange={(open) => {
              if (!open) closeDeleteModal();
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Quitar participante</DialogTitle>
                <DialogDescription className="text-xs">¿Estás seguro de que quieres quitar a este participante del evento? Esta acción se aplicará cuando guardes los cambios.</DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <Button variant="outline" onClick={closeDeleteModal}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleConfirmDeleteParticipant}>
                  Acepto
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* TAB: Certificados */}
        <TabsContent value="certificates">
          <Card>
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FileBadge className="h-4 w-4" />
                <div>
                  <p className="text-sm font-semibold">Certificados</p>
                  <p className="text-xs text-muted-foreground">Gestión de certificados por participante</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 rounded-md border bg-background px-2">
                  <Search className="h-3 w-3 text-muted-foreground" />
                  <Input className="h-8 border-none px-0 text-xs focus-visible:ring-0" placeholder="Buscar por nombre, DNI o email…" value={certSearch} onChange={(e) => setCertSearch(e.target.value)} />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={handleRejectCertificates}
                    disabled={runningEventAction || hasAnyPending}
                    title={hasAnyPending ? 'Primero genera certificados' : 'Rechazar seleccionados'}
                  >
                    <Trash2 className="h-3 w-3" />
                    Rechazar
                  </Button>

                  <Button type="button" size="sm" className="gap-1" onClick={handlePrimaryCertificatesAction} disabled={runningEventAction}>
                    {runningEventAction && <Loader2 className="h-3 w-3 animate-spin" />}
                    <FileBadge className="h-3 w-3" />
                    {hasAnyPending ? 'Generar certificados' : 'Emitir firma certificado'}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {filteredForCert.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">No hay participantes que coincidan con el filtro.</div>
              ) : (
                <div className="max-h-[420px] overflow-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="px-3 py-2">
                          <Checkbox
                            disabled={!canSelectRows}
                            checked={canSelectRows && filteredForCert.length > 0 && filteredForCert.every((p) => selectedForCert.has(p.national_id))}
                            onCheckedChange={(checked) => toggleSelectAllCert(Boolean(checked))}
                            aria-label="Seleccionar todos"
                          />
                        </th>

                        <th className="px-3 py-2 text-left font-semibold">DNI</th>
                        <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                        <th className="px-3 py-2 text-left font-semibold">Email</th>
                        <th className="px-3 py-2 text-left font-semibold">Estado certificado</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredForCert.map((p) => {
                        const fullName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
                        const certStatusLabel = certStatusLabelFor(p);

                        return (
                          <tr
                            key={p.national_id}
                            className={`border-t ${canSelectRows ? 'cursor-pointer hover:bg-muted/40' : ''}`}
                            onClick={() => {
                              if (!canSelectRows) return;
                              toggleSelectCert(p.national_id, !selectedForCert.has(p.national_id));
                            }}
                          >
                            <td className="px-3 py-1" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                disabled={!canSelectRows}
                                checked={selectedForCert.has(p.national_id)}
                                onCheckedChange={(checked) => toggleSelectCert(p.national_id, Boolean(checked))}
                                aria-label={`Seleccionar ${p.national_id}`}
                              />
                            </td>
                            <td className="px-3 py-1 font-mono">{p.national_id}</td>
                            <td className="px-3 py-1">{fullName || '—'}</td>
                            <td className="px-3 py-1">{p.email || '—'}</td>
                            <td className="px-3 py-1">
                              <Badge variant="outline" className={`text-[10px] uppercase ${certBadgeClass(certStatusLabel)}`}>
                                {certStatusLabel}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {!canSelectRows && (
                    <div className="border-t bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                      Hay participantes en <strong>PENDIENTE</strong>. Primero genera certificados (aplica a todos). Luego podrás seleccionar para firmar o rechazar.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default EventDetailPage;
