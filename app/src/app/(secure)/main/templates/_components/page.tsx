/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import type { FC, FormEvent } from 'react';
import { useEffect, useState, useTransition } from 'react';
import Image from 'next/image';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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

import { toast } from 'sonner';
import { Loader2, AlertTriangle, Info, FileText, FileType } from 'lucide-react';

import { TemplatesHeader } from './templates-header';
import { TemplatesFilters } from './templates-filters';
import { TemplatesList } from './templates-list';
import type { LoadTemplatesOptions, TemplatePreviewState } from './template-types';

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

  const [previewMap, setPreviewMap] = useState<Record<string, TemplatePreviewState>>({});

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  const [disablingId, setDisablingId] = useState<string | null>(null);

  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplateItem | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editMainPdfFile, setEditMainPdfFile] = useState<File | null>(null);
  const [editAssocPdfFile, setEditAssocPdfFile] = useState<File | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [newAssocPreviewUrl, setNewAssocPreviewUrl] = useState<string | null>(null);

  // preview temporal del PDF asociado nuevo
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
      case 'recognition':
        return 'RECOGNITION';
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
        const message = err?.message ?? 'Ocurrió un error al obtener las plantillas.';
        setError(message);
        toast.error('No se pudieron cargar las plantillas', {
          description: message,
        });
      }
    });
  };

  useEffect(() => {
    loadTemplates({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPreviewForTemplate = (templateId: string, fileId: string): void => {
    setPreviewMap((prev) => {
      const current = prev[templateId];
      if (current && (current.loading || current.src || current.error)) {
        return prev;
      }
      return { ...prev, [templateId]: { src: current?.src ?? null, kind: current?.kind ?? null, loading: true, error: null } };
    });

    void (async () => {
      try {
        const result: FilePreviewResult = await fn_get_file_preview(fileId);

        if (result.kind === 'image' || result.kind === 'pdf') {
          setPreviewMap((prev) => ({ ...prev, [templateId]: { src: result.url, kind: result.kind, loading: false, error: null } }));
        } else {
          setPreviewMap((prev) => ({
            ...prev,
            [templateId]: { src: null, kind: result.kind, loading: false, error: 'Tipo de archivo no soportado para vista previa (solo imagen o PDF).' },
          }));
        }
      } catch (err: any) {
        setPreviewMap((prev) => ({ ...prev, [templateId]: { src: null, kind: null, loading: false, error: err?.message ?? 'Error al obtener vista previa' } }));
      }
    })();
  };

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

  const handleOpenEdit = (template: DocumentTemplateItem): void => {
    setEditingTemplate(template);
    setEditCode(template.code);
    setEditName(template.name);
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
    setEditMainPdfFile(null);
    setEditAssocPdfFile(null);
    setNewAssocPreviewUrl(null);
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!editingTemplate) return;

    setIsSavingEdit(true);
    try {
      let newFileId: string | undefined = editingTemplate.file_id;
      let newPrevFileId: string | undefined = editingTemplate.prev_file_id;

      if (editMainPdfFile) {
        const uploaded: UploadResult = await fn_upload_template_file(editMainPdfFile);
        newFileId = uploaded.id;
      }

      if (editAssocPdfFile) {
        const uploaded: UploadResult = await fn_upload_preview_image(editAssocPdfFile);
        newPrevFileId = uploaded.id;

        if (newPrevFileId) loadPreviewForTemplate(editingTemplate.id, newPrevFileId);
      }

      await fn_update_document_template(editingTemplate.id, {
        code: editCode || undefined,
        name: editName || undefined,
        ...(newFileId && newFileId !== editingTemplate.file_id ? { file_id: newFileId } : {}),
        ...(newPrevFileId && newPrevFileId !== editingTemplate.prev_file_id ? { prev_file_id: newPrevFileId } : {}),
      });

      setTemplates((prev) => prev.map((t) => (t.id === editingTemplate.id ? { ...t, code: editCode, name: editName, file_id: newFileId ?? t.file_id, prev_file_id: newPrevFileId ?? t.prev_file_id } : t)));

      toast.success('Plantilla actualizada con éxito');
      handleCloseEdit();
    } catch (err: any) {
      toast.error('No se pudo actualizar la plantilla', { description: err?.message ?? 'Error inesperado al guardar cambios.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDisable = async (id: string): Promise<void> => {
    setDisablingId(id);
    try {
      await fn_disable_document_template(id);

      setTemplates((prev) => prev.filter((t) => t.id !== id));

      toast.success('Plantilla deshabilitada correctamente', { description: 'Se ha desactivado la plantilla (baja lógica).' });
    } catch (err: any) {
      toast.error('No se pudo deshabilitar la plantilla', { description: err?.message ?? 'Error inesperado al deshabilitar.' });
    } finally {
      setDisablingId(null);
    }
  };

  const handleOpenPreview = (templateId: string, title: string): void => {
    setPreviewTemplateId(templateId);
    setPreviewTitle(title);
    setIsPreviewOpen(true);
  };

  const previewTemplate = previewTemplateId ? templates.find((t) => t.id === previewTemplateId) : null;
  const dialogPreviewState: TemplatePreviewState | undefined = previewTemplateId ? previewMap[previewTemplateId] : undefined;

  const editingPreviewState: TemplatePreviewState | undefined = editingTemplate ? previewMap[editingTemplate.id] : undefined;

  return (
    <div className="space-y-6 p-6">
      <TemplatesHeader />

      <TemplatesFilters search={search} isPending={isPending} onSearchChange={setSearch} onSubmit={handleSearchSubmit} onTypeChange={handleTypeChange} />

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

      {!error && isPending && templates.length === 0 && (
        <div className="flex justify-center items-center py-10 text-muted-foreground text-sm">
          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
          Cargando plantillas...
        </div>
      )}

      {!error && (
        <>
          {templates.length === 0 && !isPending ? (
            <div className="bg-card p-6 border border-border rounded-md text-muted-foreground text-sm text-center">No se encontraron plantillas con los filtros actuales.</div>
          ) : (
            <TemplatesList
              templates={templates}
              previewMap={previewMap}
              disablingId={disablingId}
              onOpenEdit={handleOpenEdit}
              onDisable={handleDisable}
              onOpenPreview={handleOpenPreview}
              formatDate={formatDate}
            />
          )}

          {pagination && templates.length > 0 && (
            <div className="flex md:flex-row flex-col justify-between items-center gap-3 pt-4 border-border border-t text-muted-foreground text-xs">
              <div>
                Página <span className="font-medium">{currentPage}</span>
                {total > 0 && (
                  <>
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
