/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import type { FC, FormEvent } from 'react';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Loader2, AlertTriangle, FileText, FileType, Info } from 'lucide-react';
import { toast } from 'sonner';

// Dialog + Label + Textarea de shadcn
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// 🔹 Server actions y tipos (fn-doc-template.ts)
import {
  fn_get_document_templates,
  fn_update_document_template,
  fn_disable_document_template,
  type DocumentTemplateItem,
  type DocumentTemplatesFilters,
  type DocumentTemplatesPagination,
} from '@/actions/fn-doc-template';

import { fn_get_file_preview, type FilePreviewResult } from '@/actions/fn-file-preview';
import { fn_upload_template_file, fn_upload_preview_image, type UploadResult } from '@/actions/fn-file-upload';

type LoadTemplatesOptions = {
  page?: number;
  search?: string;
  type?: string; // 'certificate' | 'constancy' | etc (UI), se mapea a template_type_code
};

type TemplatePreviewState = {
  src: string | null;
  kind: 'image' | 'pdf' | 'text' | null;
  loading: boolean;
  error: string | null;
};

const TemplatesPage: FC = () => {
  const [templates, setTemplates] = useState<DocumentTemplateItem[]>([]);
  const [, setFilters] = useState<DocumentTemplatesFilters | null>(null);
  const [pagination, setPagination] = useState<DocumentTemplatesPagination | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  const [pageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 🔹 Previews por plantilla (usa prev_file_id)
  const [previewMap, setPreviewMap] = useState<Record<string, TemplatePreviewState>>({});

  // 🔹 Diálogo de vista previa grande
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  // 🔹 Estados para “eliminar” (disable)
  const [disablingId, setDisablingId] = useState<string | null>(null);

  // 🔹 Estados para edición / modal
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplateItem | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMainPdfFile, setEditMainPdfFile] = useState<File | null>(null); // PDF principal
  const [editAssocPdfFile, setEditAssocPdfFile] = useState<File | null>(null); // PDF asociado
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [newAssocPreviewUrl, setNewAssocPreviewUrl] = useState<string | null>(null);

  // Previsualización local del nuevo PDF asociado (solo para indicar que hay archivo)
  useEffect(() => {
    if (!editAssocPdfFile) {
      setNewAssocPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(editAssocPdfFile);
    setNewAssocPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [editAssocPdfFile]);

  const mapTypeFilterToTemplateCode = (type?: string): string | undefined => {
    if (!type) return undefined;
    switch (type) {
      case 'certificate':
        return 'CERTIFICATE';
      case 'constancy':
        return 'CONSTANCY';
      default:
        return undefined;
    }
  };

  const loadTemplates = (opts?: LoadTemplatesOptions): void => {
    startTransition(async () => {
      try {
        const templateTypeCode = mapTypeFilterToTemplateCode(opts?.type ?? typeFilter);

        const result = await fn_get_document_templates({
          page: opts?.page ?? page,
          page_size: pageSize,
          search_query: opts?.search ?? (search || undefined),
          is_active: true,
          template_type_code: templateTypeCode,
        });

        setTemplates(result.items);
        setFilters(result.filters);
        setPagination(result.pagination);
        setPage(result.pagination.page);
        setError(null);
      } catch (err: any) {
        console.error(err);
        const message = err?.message ?? 'Ocurrió un error al obtener las plantillas.';
        setError(message);
        toast.error('No se pudieron cargar las plantillas', {
          description: message,
        });
      }
    });
  };

  // 🔹 Cargar la primera página al montar
  useEffect(() => {
    loadTemplates({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔹 Función para cargar la preview de una plantilla (usa prev_file_id)
  const loadPreviewForTemplate = (templateId: string, fileId: string): void => {
    setPreviewMap((prev) => {
      const current = prev[templateId];
      if (current && (current.loading || current.src || current.error)) {
        return prev;
      }
      return {
        ...prev,
        [templateId]: {
          src: current?.src ?? null,
          kind: current?.kind ?? null,
          loading: true,
          error: null,
        },
      };
    });

    void (async () => {
      try {
        const result: FilePreviewResult = await fn_get_file_preview(fileId);

        if (result.kind === 'image' || result.kind === 'pdf') {
          setPreviewMap((prev) => ({
            ...prev,
            [templateId]: {
              src: result.url,
              kind: result.kind,
              loading: false,
              error: null,
            },
          }));
        } else {
          setPreviewMap((prev) => ({
            ...prev,
            [templateId]: {
              src: null,
              kind: result.kind,
              loading: false,
              error: 'Tipo de archivo no soportado para vista previa (solo imagen o PDF).',
            },
          }));
        }
      } catch (err: any) {
        console.error('Error al obtener vista previa del archivo:', err);
        setPreviewMap((prev) => ({
          ...prev,
          [templateId]: {
            src: null,
            kind: null,
            loading: false,
            error: err?.message ?? 'Error al obtener vista previa',
          },
        }));
      }
    })();
  };

  // 🔹 Cargar previews para las plantillas que tengan prev_file_id
  useEffect(() => {
    templates.forEach((tpl) => {
      if (tpl.prev_file_id) {
        loadPreviewForTemplate(tpl.id, tpl.prev_file_id);
      }
    });
  }, [templates]);

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    loadTemplates({ page: 1, search });
  };

  const handleTypeChange = (value: string): void => {
    const type = value === 'all' ? undefined : value;
    setTypeFilter(type);
    loadTemplates({ page: 1, type });
  };

  const currentPage = pagination?.page ?? page;
  const total = pagination?.total_items ?? 0;

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  const handleRetry = (): void => {
    setError(null);
    loadTemplates({ page: 1 });
  };

  // 🔹 Abrir modal de edición
  const handleOpenEdit = (template: DocumentTemplateItem): void => {
    setEditingTemplate(template);
    setEditCode(template.code);
    setEditName(template.name);
    setEditDescription(template.description ?? '');
    setEditMainPdfFile(null);
    setEditAssocPdfFile(null);
    setNewAssocPreviewUrl(null);

    if (template.prev_file_id) {
      loadPreviewForTemplate(template.id, template.prev_file_id);
    }
  };

  const handleCloseEdit = (): void => {
    setEditingTemplate(null);
    setEditCode('');
    setEditName('');
    setEditDescription('');
    setEditMainPdfFile(null);
    setEditAssocPdfFile(null);
    setNewAssocPreviewUrl(null);
  };

  // 🔹 Guardar cambios (PATCH /document-template/:id)
  const handleSaveEdit = async (): Promise<void> => {
    if (!editingTemplate) return;

    setIsSavingEdit(true);
    try {
      let newFileId: string | undefined = editingTemplate.file_id;
      let newPrevFileId: string | undefined = editingTemplate.prev_file_id;

      // 1) Subir PDF principal si hay uno nuevo
      if (editMainPdfFile) {
        const uploaded: UploadResult = await fn_upload_template_file(editMainPdfFile);
        newFileId = uploaded.id;
      }

      // 2) Subir PDF asociado si hay uno nuevo
      if (editAssocPdfFile) {
        const uploaded: UploadResult = await fn_upload_preview_image(editAssocPdfFile);
        newPrevFileId = uploaded.id;

        if (newPrevFileId) {
          loadPreviewForTemplate(editingTemplate.id, newPrevFileId);
        }
      }

      // 3) PATCH backend
      await fn_update_document_template(editingTemplate.id, {
        code: editCode || undefined,
        name: editName || undefined,
        description: editDescription || undefined,
        ...(newFileId && newFileId !== editingTemplate.file_id ? { file_id: newFileId } : {}),
        ...(newPrevFileId && newPrevFileId !== editingTemplate.prev_file_id ? { prev_file_id: newPrevFileId } : {}),
      });

      // 4) Actualizar estado local
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id
            ? {
                ...t,
                code: editCode,
                name: editName,
                description: editDescription,
                file_id: newFileId ?? t.file_id,
                prev_file_id: newPrevFileId ?? t.prev_file_id,
              }
            : t,
        ),
      );

      toast.success('Plantilla actualizada con éxito');
      handleCloseEdit();
    } catch (err: any) {
      console.error(err);
      toast.error('No se pudo actualizar la plantilla', {
        description: err?.message ?? 'Error inesperado al guardar cambios.',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // 🔹 “Eliminar” = deshabilitar (PATCH /document-template/:id/disable)
  const handleDisable = async (id: string): Promise<void> => {
    setDisablingId(id);
    try {
      await fn_disable_document_template(id);

      setTemplates((prev) => prev.filter((t) => t.id !== id));

      toast.success('Plantilla deshabilitada correctamente', {
        description: 'Se ha desactivado la plantilla (baja lógica).',
      });
    } catch (err: any) {
      console.error(err);
      toast.error('No se pudo deshabilitar la plantilla', {
        description: err?.message ?? 'Error inesperado al deshabilitar.',
      });
    } finally {
      setDisablingId(null);
    }
  };

  const previewTemplate = previewTemplateId ? templates.find((t) => t.id === previewTemplateId) : null;
  const dialogPreviewState: TemplatePreviewState | undefined = previewTemplateId ? previewMap[previewTemplateId] : undefined;

  const editingPreviewState: TemplatePreviewState | undefined = editingTemplate ? previewMap[editingTemplate.id] : undefined;

  return (
    <div className="space-y-6 bg-background p-6">
      {/* Header */}
      <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4">
        <div>
          <h1 className="font-bold text-foreground text-xl">Gestión de Plantillas</h1>
          <p className="text-muted-foreground text-sm">Crea y administra plantillas de certificados y constancias</p>
        </div>
        <Link href="/main/templates/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Plantilla
          </Button>
        </Link>
      </div>

      {/* Filtros: búsqueda + tipo */}
      <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <Input placeholder="Buscar por nombre o descripción..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Buscar
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Tipo:</span>
          <Select defaultValue="all" onValueChange={handleTypeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="certificate">Certificados</SelectItem>
              <SelectItem value="constancy">Constancias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error global */}
      {error && (
        <Card className="bg-destructive/5 p-6 border border-destructive/40">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div>
              <h2 className="font-semibold text-destructive text-sm">No se pudieron cargar las plantillas</h2>
              <p className="mt-1 text-muted-foreground text-xs">Ocurrió un problema al comunicarse con el servidor. Por favor, inténtalo nuevamente en unos momentos.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRetry} disabled={isPending} className="mt-1">
              {isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Reintentar
            </Button>
          </div>
        </Card>
      )}

      {/* Loading inicial */}
      {!error && isPending && templates.length === 0 && (
        <div className="flex justify-center items-center py-10 text-muted-foreground text-sm">
          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
          Cargando plantillas...
        </div>
      )}

      {/* Grid */}
      {!error && (
        <>
          {templates.length === 0 && !isPending ? (
            <div className="bg-card p-6 border border-border rounded-md text-muted-foreground text-sm text-center">No se encontraron plantillas con los filtros actuales.</div>
          ) : (
            <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => {
                const tplPreview = previewMap[template.id];
                const hasPreview = !!template.prev_file_id;

                return (
                  <Card key={template.id} className="bg-card shadow-sm hover:shadow-lg p-4 border border-border rounded-md transition-shadow">
                    <div className="space-y-4">
                      {/* Header */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold text-foreground text-sm">{template.name}</h3>

                          <span
                            className={`rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-wide
                          ${
                            template.document_type_code === 'CERTIFICATE' ? 'border-primary/20 bg-primary/10 text-primary' : 'border-accent/20 bg-accent/10 text-accent-foreground'
                          }`}
                          >
                            {template.document_type_name}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          Código: <span className="font-mono text-[11px]">{template.code}</span>
                        </p>
                        <p className="mt-1 text-muted-foreground text-xs">{template.description}</p>
                        {template.category_name && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Categoría:{' '}
                            <span className="font-medium">
                              {template.category_name} ({template.category_code})
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="space-y-1 text-muted-foreground text-xs">
                        <p>Creada: {formatDate(template.created_at)}</p>
                        <p>Actualizada: {formatDate(template.updated_at)}</p>
                      </div>

                      {/* Preview usando prev_file_id */}
                      <div className="flex justify-center items-center bg-muted p-4 border border-border rounded min-h-32">
                        <div className="w-full">
                          <p className="text-muted-foreground text-xs text-center">Vista previa asociada</p>

                          <div
                            className={`relative flex justify-center items-center bg-background mx-auto mt-2 border border-border border-dashed rounded max-w-xs h-40 overflow-hidden ${
                              hasPreview ? 'cursor-zoom-in' : 'cursor-not-allowed'
                            }`}
                            role={hasPreview ? 'button' : undefined}
                            tabIndex={hasPreview ? 0 : -1}
                            onClick={() => {
                              if (!hasPreview) return;
                              setPreviewTemplateId(template.id);
                              setPreviewTitle(template.name);
                              setIsPreviewOpen(true);
                            }}
                            onKeyDown={(e) => {
                              if (!hasPreview) return;
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setPreviewTemplateId(template.id);
                                setPreviewTitle(template.name);
                                setIsPreviewOpen(true);
                              }
                            }}
                          >
                            {!hasPreview ? (
                              <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
                                <Info className="w-4 h-4" />
                                <span>Sin archivo asociado</span>
                              </div>
                            ) : !tplPreview || tplPreview.loading ? (
                              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Cargando vista previa...</span>
                              </div>
                            ) : tplPreview.error || !tplPreview.src ? (
                              <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
                                <Info className="w-4 h-4" />
                                <span>{tplPreview.error || 'Recurso no disponible'}</span>
                              </div>
                            ) : tplPreview.kind === 'image' ? (
                              <Image src={tplPreview.src} alt="Previsualización" fill className="object-contain" sizes="(max-width: 768px) 100vw, 33vw" unoptimized />
                            ) : tplPreview.kind === 'pdf' ? (
                              <iframe src={tplPreview.src ?? ''} title="PDF asociado" className="w-full h-full" />
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
                                <Info className="w-4 h-4" />
                                <span>Tipo de archivo no soportado.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-border border-t">
                        <Button variant="ghost" size="sm" className="flex-1 gap-2 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit(template)}>
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 gap-2 text-destructive hover:text-destructive/80"
                          onClick={() => handleDisable(template.id)}
                          disabled={disablingId === template.id}
                        >
                          {disablingId === template.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Paginado */}
          {pagination && templates.length > 0 && (
            <div className="flex md:flex-row flex-col justify-between items-center gap-3 pt-4 border-border border-t text-muted-foreground text-xs">
              <div>
                Página <span className="font-medium">{currentPage}</span>
                {total > 0 && (
                  <>
                    {' '}
                    · Total: <span className="font-medium">{total}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={isPending || !pagination.has_prev_page} onClick={() => loadTemplates({ page: currentPage - 1 })}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={isPending || !pagination.has_next_page} onClick={() => loadTemplates({ page: currentPage + 1 })}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 🔹 Modal de edición de plantilla */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar plantilla</DialogTitle>
            <DialogDescription>Modifica el código, nombre, descripción o reemplaza los PDFs asociados.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="code">Código</Label>
              <Input id="code" value={editCode} onChange={(e) => setEditCode(e.target.value)} className="font-mono text-[12px]" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>

            {/* PDF principal */}
            <div className="space-y-1">
              <Label htmlFor="main-pdf">PDF principal (plantilla)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="main-pdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setEditMainPdfFile(file);
                  }}
                />
              </div>
              <p className="flex items-center gap-1 mt-1 text-muted-foreground text-xs">
                <FileText className="w-3 h-3" />
                Si seleccionas un nuevo PDF, se subirá al guardar cambios.
              </p>
              {editMainPdfFile && (
                <p className="mt-1 text-muted-foreground text-xs">
                  Archivo seleccionado: <span className="font-medium">{editMainPdfFile.name}</span>
                </p>
              )}
            </div>

            {/* PDF asociado */}
            <div className="space-y-1">
              <Label htmlFor="assoc-pdf">PDF asociado</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="assoc-pdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setEditAssocPdfFile(file);
                  }}
                />
              </div>
              <p className="flex items-center gap-1 mt-1 text-muted-foreground text-xs">
                <FileType className="w-3 h-3" />
                Este PDF se usará como referencia/vista previa asociada.
              </p>

              <div className="gap-3 grid grid-cols-2 mt-2 text-muted-foreground text-xs">
                {/* Actual */}
                <div>
                  <p className="mb-1 font-medium">Actual</p>
                  <div className="relative bg-muted border border-border rounded w-full aspect-4/3 overflow-hidden">
                    {!editingTemplate?.prev_file_id ? (
                      <div className="flex flex-col justify-center items-center gap-1 h-full text-[11px] text-muted-foreground">
                        <Info className="w-3 h-3" />
                        <span>Sin archivo asociado</span>
                      </div>
                    ) : !editingPreviewState || editingPreviewState.loading ? (
                      <div className="flex justify-center items-center gap-1 h-full text-[11px] text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Cargando...</span>
                      </div>
                    ) : editingPreviewState.error || !editingPreviewState.src ? (
                      <div className="flex flex-col justify-center items-center gap-1 h-full text-[11px] text-muted-foreground">
                        <Info className="w-3 h-3" />
                        <span>{editingPreviewState.error || 'Recurso no disponible'}</span>
                      </div>
                    ) : editingPreviewState.kind === 'image' ? (
                      <Image src={editingPreviewState.src} alt="Archivo asociado actual" fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
                    ) : editingPreviewState.kind === 'pdf' ? (
                      <iframe src={editingPreviewState.src ?? ''} title="PDF actual" className="w-full h-full" />
                    ) : (
                      <div className="flex flex-col justify-center items-center gap-1 h-full text-[11px] text-muted-foreground">
                        <Info className="w-3 h-3" />
                        <span>No se puede previsualizar</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Nuevo */}
                <div>
                  <p className="mb-1 font-medium">Nuevo</p>
                  <div className="relative bg-muted border border-border rounded w-full aspect-4/3 overflow-hidden">
                    {newAssocPreviewUrl ? (
                      <div className="flex flex-col justify-center items-center gap-1 h-full text-[11px] text-muted-foreground">
                        <FileType className="w-3 h-3" />
                        <span>Nuevo PDF seleccionado</span>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-center items-center gap-1 h-full text-[11px] text-muted-foreground">
                        <Info className="w-3 h-3" />
                        <span>Sin nuevo archivo seleccionado</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={handleCloseEdit} disabled={isSavingEdit}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveEdit} disabled={isSavingEdit || !editName.trim() || !editCode.trim()} className="gap-2">
              {isSavingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔍 Dialog de vista previa grande (image/pdf asociado) */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-full sm:max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>{previewTitle || 'Vista previa asociada'}</DialogTitle>
            <DialogDescription>Vista previa del archivo asociado a la plantilla (imagen o PDF).</DialogDescription>
          </DialogHeader>

          <div className="relative bg-muted border border-border rounded w-full h-[70vh] overflow-hidden">
            {!previewTemplate?.prev_file_id ? (
              <div className="flex flex-col justify-center items-center gap-2 h-full text-muted-foreground text-sm">
                <Info className="w-4 h-4" />
                <span>Esta plantilla no tiene archivo asociado.</span>
              </div>
            ) : !dialogPreviewState || dialogPreviewState.loading ? (
              <div className="flex flex-col justify-center items-center gap-2 h-full text-muted-foreground text-sm">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Cargando vista previa...</span>
              </div>
            ) : dialogPreviewState.error || !dialogPreviewState.src ? (
              <div className="flex flex-col justify-center items-center gap-2 h-full text-muted-foreground text-sm">
                <Info className="w-4 h-4" />
                <span>{dialogPreviewState.error || 'Recurso no disponible'}</span>
              </div>
            ) : dialogPreviewState.kind === 'image' ? (
              <Image src={dialogPreviewState.src} alt={previewTitle || 'Vista previa grande'} fill className="object-contain" sizes="100vw" unoptimized />
            ) : dialogPreviewState.kind === 'pdf' ? (
              <iframe src={dialogPreviewState.src} title={previewTitle || 'Vista previa PDF'} className="w-full h-full" />
            ) : (
              <div className="flex flex-col justify-center items-center gap-2 h-full text-muted-foreground text-sm">
                <Info className="w-4 h-4" />
                <span>Tipo de archivo no soportado para previsualización.</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatesPage;
