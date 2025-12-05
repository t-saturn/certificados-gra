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
import { Plus, Edit2, Trash2, Loader2, AlertTriangle, FileText, Image as ImageIcon, Info } from 'lucide-react';
import { toast } from 'sonner';

// Dialog + Label + Textarea de shadcn
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// 🔹 Server actions y tipos
import { fn_get_templates, fn_update_template, type TemplateItem, type TemplatesFilters } from '@/actions/fn-template';
import { fn_get_file_preview, type FilePreviewResult } from '@/actions/fn-file-preview';
import { fn_upload_template_file, fn_upload_preview_image, type UploadResult } from '@/actions/fn-file-upload';

type LoadTemplatesOptions = {
  page?: number;
  search?: string;
  type?: string;
};

type TemplatePreviewState = {
  src: string | null;
  loading: boolean;
  error: string | null;
};

const TemplatesPage: FC = () => {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [filters, setFilters] = useState<TemplatesFilters | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  const [pageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 🔹 Previews por plantilla (prev_file_id de cada una)
  const [previewMap, setPreviewMap] = useState<Record<string, TemplatePreviewState>>({});

  // 🔹 Diálogo de vista previa grande
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [imagePreviewTitle, setImagePreviewTitle] = useState<string>('');
  const [imagePreviewTemplateId, setImagePreviewTemplateId] = useState<string | null>(null);

  // 🔹 Estados para eliminar
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 🔹 Estados para edición / modal
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null); // HTML (se sube al guardar)
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);

  // 🔹 Imagen nueva seleccionada en el modal (se sube al guardar)
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [newImagePreviewUrl, setNewImagePreviewUrl] = useState<string | null>(null);

  // Crear URL local para previsualizar la nueva imagen en el modal
  useEffect(() => {
    if (!editImageFile) {
      setNewImagePreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(editImageFile);
    setNewImagePreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [editImageFile]);

  const loadTemplates = (opts?: LoadTemplatesOptions): void => {
    startTransition(async () => {
      try {
        const result = await fn_get_templates({
          page: opts?.page ?? page,
          page_size: pageSize,
          search_query: opts?.search ?? (search || undefined),
          type: opts?.type ?? typeFilter,
        });

        setTemplates(result.templates);
        setFilters(result.filters);
        setPage(result.filters.page);
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
    // Evita sobrecargar si ya hay algo
    setPreviewMap((prev) => {
      const current = prev[templateId];
      if (current && (current.loading || current.src || current.error)) {
        return prev;
      }
      return {
        ...prev,
        [templateId]: {
          src: current?.src ?? null,
          loading: true,
          error: null,
        },
      };
    });

    void (async () => {
      try {
        const result: FilePreviewResult = await fn_get_file_preview(fileId);

        if (result.kind === 'image') {
          setPreviewMap((prev) => ({
            ...prev,
            [templateId]: {
              src: result.url,
              loading: false,
              error: null,
            },
          }));
        } else {
          setPreviewMap((prev) => ({
            ...prev,
            [templateId]: {
              src: null,
              loading: false,
              error: 'Tipo de archivo no soportado para vista previa (solo imágenes).',
            },
          }));
        }
      } catch (err: any) {
        console.error('Error al obtener vista previa del archivo:', err);
        setPreviewMap((prev) => ({
          ...prev,
          [templateId]: {
            src: null,
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

  const currentPage = filters?.page ?? page;
  const total = filters?.total ?? 0;

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
  const handleOpenEdit = (template: TemplateItem): void => {
    setEditingTemplate(template);
    setEditName(template.name);
    setEditDescription(template.description ?? '');
    setEditFile(null);
    setEditImageFile(null);
    setNewImagePreviewUrl(null);

    if (template.category_id === 1 || template.category_id === 2) {
      setEditCategoryId(template.category_id);
    } else {
      setEditCategoryId(null);
    }

    // Nos aseguramos de tener la preview actual cargada
    if (template.prev_file_id) {
      loadPreviewForTemplate(template.id, template.prev_file_id);
    }
  };

  const handleCloseEdit = (): void => {
    setEditingTemplate(null);
    setEditFile(null);
    setEditImageFile(null);
    setNewImagePreviewUrl(null);
    setEditCategoryId(null);
  };

  // 🔹 Guardar cambios:
  //   1) Si hay editFile => subir y obtener file_id
  //   2) Si hay editImageFile => subir y obtener prev_file_id (+ refrescar previewMap)
  //   3) PATCH a /template/:id con esos campos + nombre/desc/categoría
  const handleSaveEdit = async (): Promise<void> => {
    if (!editingTemplate) return;

    setIsSavingEdit(true);
    try {
      let newFileId: string | undefined = editingTemplate.file_id;
      let newPrevFileId: string | undefined = editingTemplate.prev_file_id;

      // 1) Subir archivo HTML si el usuario seleccionó uno nuevo
      if (editFile) {
        const uploadedTemplate: UploadResult = await fn_upload_template_file(editFile);
        newFileId = uploadedTemplate.id;
      }

      // 2) Subir imagen si el usuario seleccionó una nueva
      if (editImageFile) {
        const uploadedImage: UploadResult = await fn_upload_preview_image(editImageFile);
        newPrevFileId = uploadedImage.id;

        // Refrescamos la preview desde el file-server
        loadPreviewForTemplate(editingTemplate.id, newPrevFileId);
      }

      // 3) Actualizar plantilla en el backend
      await fn_update_template(editingTemplate.id, {
        name: editName,
        description: editDescription,
        category_id: editCategoryId ?? undefined,
        ...(newFileId && newFileId !== editingTemplate.file_id ? { file_id: newFileId } : {}),
        ...(newPrevFileId && newPrevFileId !== editingTemplate.prev_file_id ? { prev_file_id: newPrevFileId } : {}),
      });

      // 4) Actualizar estado local
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id
            ? {
                ...t,
                name: editName,
                description: editDescription,
                category_id: editCategoryId ?? t.category_id,
                category_name: editCategoryId === 1 ? 'trabajo' : editCategoryId === 2 ? 'sgd' : t.category_name,
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

  // 🔹 Eliminar (baja lógica: is_active = false)
  const handleDelete = async (id: string): Promise<void> => {
    setDeletingId(id);
    try {
      await fn_update_template(id, { is_active: false });

      setTemplates((prev) => prev.filter((t) => t.id !== id));

      toast.success('Plantilla eliminada correctamente', {
        description: 'Se ha desactivado la plantilla (baja lógica).',
      });
    } catch (err: any) {
      console.error(err);
      toast.error('No se pudo eliminar la plantilla', {
        description: err?.message ?? 'Error inesperado al eliminar.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Para el diálogo de vista previa grande
  const previewTemplate = imagePreviewTemplateId ? templates.find((t) => t.id === imagePreviewTemplateId) : null;
  const dialogPreviewState: TemplatePreviewState | undefined = imagePreviewTemplateId ? previewMap[imagePreviewTemplateId] : undefined;

  // Para la sección "Imagen actual" del modal de edición
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

      {/* Vista amigable de error global */}
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

      {/* Estado de carga inicial sin error */}
      {!error && isPending && templates.length === 0 && (
        <div className="flex justify-center items-center py-10 text-muted-foreground text-sm">
          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
          Cargando plantillas...
        </div>
      )}

      {/* Templates Grid */}
      {!error && (
        <>
          {templates.length === 0 && !isPending ? (
            <div className="bg-card p-6 border border-border rounded-md text-muted-foreground text-sm text-center">No se encontraron plantillas con los filtros actuales.</div>
          ) : (
            <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => {
                const tplPreview = previewMap[template.id];
                const hasImage = !!template.prev_file_id;

                return (
                  <Card key={template.id} className="bg-card shadow-sm hover:shadow-lg p-4 border border-border rounded-md transition-shadow">
                    <div className="space-y-4">
                      {/* Template Header */}
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
                        <p className="text-muted-foreground text-xs">{template.description}</p>
                        {template.category_name && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Categoría: <span className="font-medium">{template.category_name}</span>
                          </p>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="space-y-1 text-muted-foreground text-xs">
                        <p>Creada: {formatDate(template.created_at)}</p>
                        <p>Actualizada: {formatDate(template.updated_at)}</p>
                      </div>

                      {/* Preview Area usando prev_file_id de la plantilla */}
                      <div className="flex justify-center items-center bg-muted p-4 border border-border rounded min-h-32">
                        <div className="w-full">
                          <p className="text-muted-foreground text-xs text-center">Vista previa</p>

                          <div
                            className={`relative flex justify-center items-center bg-background mx-auto mt-2 border border-border border-dashed rounded max-w-xs h-40 overflow-hidden ${
                              hasImage ? 'cursor-zoom-in' : 'cursor-not-allowed'
                            }`}
                            role={hasImage ? 'button' : undefined}
                            tabIndex={hasImage ? 0 : -1}
                            onClick={() => {
                              if (!hasImage) return;
                              setImagePreviewTemplateId(template.id);
                              setImagePreviewTitle(template.name);
                              setIsImagePreviewOpen(true);
                            }}
                            onKeyDown={(e) => {
                              if (!hasImage) return;
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setImagePreviewTemplateId(template.id);
                                setImagePreviewTitle(template.name);
                                setIsImagePreviewOpen(true);
                              }
                            }}
                          >
                            {!hasImage ? (
                              <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
                                <Info className="w-4 h-4" />
                                <span>Sin imagen asociada</span>
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
                            ) : (
                              <Image src={tplPreview.src} alt="Previsualización plantilla" fill className="object-contain" sizes="(max-width: 768px) 100vw, 33vw" unoptimized />
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
                          onClick={() => handleDelete(template.id)}
                          disabled={deletingId === template.id}
                        >
                          {deletingId === template.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
          {filters && templates.length > 0 && (
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
                <Button variant="outline" size="sm" disabled={isPending || !filters.has_prev_page} onClick={() => loadTemplates({ page: currentPage - 1 })}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={isPending || !filters.has_next_page} onClick={() => loadTemplates({ page: currentPage + 1 })}>
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
            <DialogDescription>Modifica el nombre, la categoría, descripción o reemplaza la plantilla HTML/imagen asociada.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="category">Categoría</Label>
              <Select value={editCategoryId ? String(editCategoryId) : ''} onValueChange={(value) => setEditCategoryId(Number(value))}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Trabajo</SelectItem>
                  <SelectItem value="2">SGD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>

            {/* Archivo HTML (se sube solo al guardar) */}
            <div className="space-y-1">
              <Label htmlFor="file">Plantilla HTML</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".html,.htm"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setEditFile(file);
                  }}
                />
              </div>
              <p className="flex items-center gap-1 mt-1 text-muted-foreground text-xs">
                <FileText className="w-3 h-3" />
                Esta selección se subirá al guardar cambios.
              </p>
              {editFile && (
                <p className="mt-1 text-muted-foreground text-xs">
                  Archivo seleccionado: <span className="font-medium">{editFile.name}</span>
                </p>
              )}
            </div>

            {/* Imagen de plantilla: anterior vs nueva (se sube al guardar) */}
            <div className="space-y-1">
              <Label htmlFor="file-img">Imagen de la plantilla</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file-img"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setEditImageFile(file);
                  }}
                />
              </div>
              <p className="flex items-center gap-1 mt-1 text-muted-foreground text-xs">
                <ImageIcon className="w-3 h-3" />
                Si seleccionas una nueva imagen, se subirá al guardar cambios.
              </p>

              {(editingTemplate?.prev_file_id || newImagePreviewUrl) && (
                <div className="gap-3 grid grid-cols-2 mt-2 text-muted-foreground text-xs">
                  {/* Imagen actual */}
                  <div>
                    <p className="mb-1 font-medium">Imagen actual</p>
                    <div className="relative bg-muted border border-border rounded w-full aspect-4/3 overflow-hidden">
                      {!editingTemplate?.prev_file_id ? (
                        <div className="flex flex-col justify-center items-center gap-1 h-full text-[11px] text-muted-foreground">
                          <Info className="w-3 h-3" />
                          <span>Sin imagen asociada</span>
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
                      ) : (
                        <Image
                          src={editingPreviewState.src}
                          alt="Imagen actual de la plantilla"
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          unoptimized
                        />
                      )}
                    </div>
                  </div>

                  {/* Nueva imagen seleccionada */}
                  <div>
                    <p className="mb-1 font-medium">Nueva imagen</p>
                    <div className="relative bg-muted border border-border rounded w-full aspect-4/3 overflow-hidden">
                      {newImagePreviewUrl ? (
                        <Image src={newImagePreviewUrl} alt="Nueva imagen seleccionada" fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
                      ) : (
                        <div className="flex flex-col justify-center items-center gap-1 h-full text-[11px] text-muted-foreground">
                          <Info className="w-3 h-3" />
                          <span>Sin nueva imagen seleccionada</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={handleCloseEdit} disabled={isSavingEdit}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveEdit} disabled={isSavingEdit || !editName.trim()} className="gap-2">
              {isSavingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔍 Dialog de vista previa grande de la imagen */}
      <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
        <DialogContent className="max-w-full sm:max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>{imagePreviewTitle || 'Vista previa de la plantilla'}</DialogTitle>
            <DialogDescription>Haz zoom en la plantilla para revisar los detalles.</DialogDescription>
          </DialogHeader>

          <div className="relative bg-muted border border-border rounded w-full h-[70vh] overflow-hidden">
            {!previewTemplate?.prev_file_id ? (
              <div className="flex flex-col justify-center items-center gap-2 h-full text-muted-foreground text-sm">
                <Info className="w-4 h-4" />
                <span>Esta plantilla no tiene imagen de previsualización.</span>
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
            ) : (
              <Image src={dialogPreviewState.src} alt={imagePreviewTitle || 'Vista previa grande'} fill className="object-contain" sizes="100vw" unoptimized />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatesPage;
