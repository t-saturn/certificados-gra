/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ArrowLeft, CalendarDays, FileText, Users, Clock, Loader2, Trash2, Plus, Search, FileBadge, Pencil } from 'lucide-react';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

import type { EventDetailResult } from '@/actions/fn-event-detail';
import type { EventParticipant, EventSchedule, UpdateEventParticipantPatchItem } from '@/actions/fn-events';
import { fn_update_event_participants } from '@/actions/fn-events';

export interface EventDetailPageProps {
  event: EventDetailResult;
}

const formatDateTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
};

type EditableParticipant = EventParticipant & {
  full_name?: string;
  user_detail_id?: string;
  _isNew?: boolean;
  _deleted?: boolean;
};

const EventDetailPage: FC<EventDetailPageProps> = ({ event }) => {
  const router = useRouter();

  const schedules: EventSchedule[] = event.schedules ?? [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const originalParticipants: EditableParticipant[] = (event.participants ?? []) as EditableParticipant[];

  const documentTypeName = event.template?.document_type_name ?? '—';

  const [editableParticipants, setEditableParticipants] = useState<EditableParticipant[]>(originalParticipants);
  const [savingParticipants, setSavingParticipants] = useState(false);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    national_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  }>({
    national_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const originalByDni = useMemo(() => {
    const map = new Map<string, EditableParticipant>();
    originalParticipants.forEach((p) => {
      map.set(p.national_id, p);
    });
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

  const closeEditModal = (): void => {
    setEditingIndex(null);
  };

  const openDeleteModal = (idx: number): void => {
    setDeleteIndex(idx);
  };

  const closeDeleteModal = (): void => {
    setDeleteIndex(null);
  };

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
      copy[deleteIndex] = {
        ...copy[deleteIndex],
        _deleted: true,
      };
      return copy;
    });

    closeDeleteModal();
  };

  const handleAddParticipantRow = (): void => {
    setEditableParticipants((prev) => [
      ...prev,
      {
        national_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        registration_source: 'IMPORTED',
        _isNew: true,
      },
    ]);
  };

  const handleSaveParticipants = async (): Promise<void> => {
    const patches: UpdateEventParticipantPatchItem[] = [];

    editableParticipants.forEach((p) => {
      const original = originalByDni.get(p.national_id);

      if (p._deleted) {
        if (original) {
          patches.push({
            national_id: original.national_id,
            remove: true,
          });
        }
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

      // 3) existentes
      if (original) {
        const changed =
          p.first_name !== original.first_name || p.last_name !== original.last_name || (p.phone ?? '') !== (original.phone ?? '') || (p.email ?? '') !== (original.email ?? '');

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
      toast.error('No se pudieron actualizar los participantes', {
        description: error?.message,
      });
    } finally {
      setSavingParticipants(false);
    }
  };

  const [certSearch, setCertSearch] = useState('');
  const [selectedForCert, setSelectedForCert] = useState<Set<string>>(new Set());

  const visibleParticipants = editableParticipants.filter((p) => !p._deleted);

  const filteredForCert = useMemo(() => {
    if (!certSearch.trim()) return visibleParticipants;
    const term = certSearch.trim().toLowerCase();
    return visibleParticipants.filter((p) => {
      const fullName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase();
      return p.national_id.toLowerCase().includes(term) || fullName.includes(term) || (p.email ?? '').toLowerCase().includes(term);
    });
  }, [certSearch, visibleParticipants]);

  const toggleSelectAllCert = (checked: boolean): void => {
    if (checked) {
      const next = new Set<string>();
      filteredForCert.forEach((p) => next.add(p.national_id));
      setSelectedForCert(next);
    } else {
      setSelectedForCert(new Set());
    }
  };

  const toggleSelectCert = (dni: string, checked: boolean): void => {
    setSelectedForCert((prev) => {
      const next = new Set(prev);
      if (checked) next.add(dni);
      else next.delete(dni);
      return next;
    });
  };

  const handleGenerateCertificates = (): void => {
    if (selectedForCert.size === 0) {
      toast.info('Selecciona al menos un participante para generar certificados');
      return;
    }
    toast.success(`Generar certificado para ${selectedForCert.size} participante(s) (TODO backend).`);
  };

  const handleDeleteCertificates = (): void => {
    if (selectedForCert.size === 0) {
      toast.info('Selecciona al menos un participante');
      return;
    }
    toast.info('TODO: eliminar certificados seleccionados (backend).');
  };

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

        {/* TAB: Información principal */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4" />
                <span>Descripción</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{event.description || 'Sin descripción.'}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Detalles básicos */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="h-4 w-4" />
                  <span>Detalles del evento</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <span>Tipo de documento</span>
                  <span className="font-medium text-foreground">{documentTypeName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Ubicación</span>
                  <span className="font-medium text-foreground">{event.location || '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Creado por</span>
                  <span className="font-mono text-[11px]">{event.created_by}</span>
                </div>
              </CardContent>
            </Card>

            {/* Fechas (schedules) */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4" />
                  <span>Fechas / Horarios</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {schedules.length === 0 ? (
                  <p>No hay fechas registradas.</p>
                ) : (
                  <ul className="space-y-2">
                    {schedules.map((s, idx) => (
                      <li key={`${s.start_datetime}-${idx}`} className="flex flex-col rounded-md border border-border bg-muted/40 px-3 py-2">
                        <span className="text-[11px] uppercase text-muted-foreground">Sesión {idx + 1}</span>
                        <span>
                          <strong>Inicio:</strong> {formatDateTime(s.start_datetime)}
                        </span>
                        <span>
                          <strong>Fin:</strong> {formatDateTime(s.end_datetime)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: Participantes (CRUD) */}
        <TabsContent value="participants">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <div>
                  <p className="text-sm font-semibold">Participantes</p>
                  <p className="text-xs text-muted-foreground">Total filas (incl. nuevas): {visibleParticipants.length}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" className="gap-1" onClick={handleAddParticipantRow}>
                  <Plus className="h-3 w-3" />
                  Agregar participante
                </Button>

                <Button type="button" size="sm" className="gap-2" onClick={handleSaveParticipants} disabled={savingParticipants}>
                  {savingParticipants && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar cambios
                </Button>
              </div>
            </CardHeader>

            <CardContent>
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
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          national_id: e.target.value,
                        }))
                      }
                      disabled={editingIndex !== null && !editableParticipants[editingIndex]?._isNew}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label>Nombre</Label>
                    <Input
                      value={editForm.first_name}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          first_name: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label>Apellido</Label>
                    <Input
                      value={editForm.last_name}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          last_name: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label>Email</Label>
                    <Input
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label>Teléfono</Label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
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
                <DialogDescription className="text-xs">
                  ¿Estás seguro de que quieres quitar a este participante del evento? Esta acción se aplicará cuando guardes los cambios.
                </DialogDescription>
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
                  <Input
                    className="h-8 border-none px-0 text-xs focus-visible:ring-0"
                    placeholder="Buscar por nombre, DNI o email…"
                    value={certSearch}
                    onChange={(e) => setCertSearch(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={handleDeleteCertificates}>
                    <Trash2 className="h-3 w-3" />
                    Eliminar
                  </Button>
                  <Button type="button" size="sm" className="gap-1" onClick={handleGenerateCertificates}>
                    <FileBadge className="h-3 w-3" />
                    Generar certificados
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
                            checked={filteredForCert.length > 0 && filteredForCert.every((p) => selectedForCert.has(p.national_id))}
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

                        const dummyStatus = 'PENDING'; // placeholder

                        return (
                          <tr key={p.national_id} className="border-t">
                            <td className="px-3 py-1">
                              <Checkbox
                                checked={selectedForCert.has(p.national_id)}
                                onCheckedChange={(checked) => toggleSelectCert(p.national_id, Boolean(checked))}
                                aria-label={`Seleccionar ${p.national_id}`}
                              />
                            </td>
                            <td className="px-3 py-1 font-mono">{p.national_id}</td>
                            <td className="px-3 py-1">{fullName || '—'}</td>
                            <td className="px-3 py-1">{p.email || '—'}</td>
                            <td className="px-3 py-1">
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {dummyStatus}
                              </Badge>
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
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default EventDetailPage;
