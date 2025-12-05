/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import type React from 'react';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { ArrowLeft, Loader2, Info, FileText, FileType, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';

import { fn_upload_template_file, fn_upload_preview_image, type UploadResult } from '@/actions/fn-file-upload';
import { fn_get_file_preview, type FilePreviewResult } from '@/actions/fn-file-preview';

import { fn_get_document_types, type DocumentTypeItem } from '@/actions/fn-doc-type';
import { fn_get_document_categories, type DocumentCategoryItem } from '@/actions/fn-doc-category';
import { fn_create_document_template, type FnCreateDocumentTemplate } from '@/actions/fn-doc-template';

type TemplateFormState = {
  code: string;
  name: string;
  document_type_id: string;
  category_id: string; // luego lo parseamos a number
  description: string;
};

export default function NewTemplatePage() {
  const router = useRouter();

  // ---- catálogos dinámicos ----
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeItem[]>([]);
  const [categories, setCategories] = useState<DocumentCategoryItem[]>([]);
  const [loadingDocTypes, setLoadingDocTypes] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [templateData, setTemplateData] = useState<TemplateFormState>({
    code: '',
    name: '',
    document_type_id: '',
    category_id: '',
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- estado de archivos subidos ----
  const [fileId, setFileId] = useState<string | null>(null); // plantilla PDF
  const [prevFileId, setPrevFileId] = useState<string | null>(null); // PDF asociado
  const [templateFileName, setTemplateFileName] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);

  // ---- estado de subida ----
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);

  // ---- estado de previsualización PLANTILLA PRINCIPAL ----
  const [mainPreviewSrc, setMainPreviewSrc] = useState<string | null>(null);
  const [mainPreviewKind, setMainPreviewKind] = useState<'image' | 'pdf' | 'text' | null>(null);
  const [mainPreviewLoading, setMainPreviewLoading] = useState(false);
  const [mainPreviewError, setMainPreviewError] = useState<string | null>(null);

  // ---- estado de previsualización PDF ASOCIADO ----
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<'image' | 'pdf' | 'text' | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // ---- estado popovers / búsqueda para tipo y categoría ----
  const [openTypePopover, setOpenTypePopover] = useState(false);
  const [openCategoryPopover, setOpenCategoryPopover] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  /* -------------------- Cargar catálogos -------------------- */

  const loadDocumentTypes = async (searchQuery: string, autoSelectFirst = false) => {
    setLoadingDocTypes(true);
    try {
      const dtResult = await fn_get_document_types({
        page: 1,
        page_size: 50,
        is_active: true,
        search_query: searchQuery || undefined,
      });

      setDocumentTypes(dtResult.items);

      if (autoSelectFirst && dtResult.items.length > 0 && !templateData.document_type_id) {
        setTemplateData((prev) => ({
          ...prev,
          document_type_id: dtResult.items[0].id,
        }));
      }
    } catch (error: any) {
      console.error('Error al cargar tipos de documento:', error);
      toast.error(error?.message || 'Error al cargar los tipos de documento');
    } finally {
      setLoadingDocTypes(false);
    }
  };

  const loadCategories = async (searchQuery: string, autoSelectFirst = false) => {
    const selectedDocType = documentTypes.find((dt) => dt.id === templateData.document_type_id);

    if (!selectedDocType) {
      setCategories([]);
      if (autoSelectFirst) {
        setTemplateData((prev) => ({ ...prev, category_id: '' }));
      }
      return;
    }

    setLoadingCategories(true);
    try {
      const catResult = await fn_get_document_categories({
        page: 1,
        page_size: 50,
        is_active: true,
        search_query: searchQuery || undefined,
        doc_type_code: selectedDocType.code, // filtramos por tipo
      });

      setCategories(catResult.items);

      if (autoSelectFirst && !templateData.category_id && catResult.items.length > 0) {
        setTemplateData((prev) => ({
          ...prev,
          category_id: catResult.items[0].id.toString(),
        }));
      }
    } catch (error: any) {
      console.error('Error al cargar categorías:', error);
      setCategories([]);
      setTemplateData((prev) => ({ ...prev, category_id: '' }));
      toast.error(error?.message || 'Error al cargar las categorías');
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    // Carga inicial de tipos (sin search_query, auto-select del primero)
    void loadDocumentTypes('', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando cambia el tipo seleccionado y ya tenemos tipos, podemos cargar categorías por defecto
  useEffect(() => {
    if (templateData.document_type_id) {
      void loadCategories('', true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateData.document_type_id]);

  /* -------------------- Handlers de formulario -------------------- */

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as any;

    setTemplateData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 🔹 Subida del archivo de plantilla (PDF principal)
  const handleTemplateFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTemplate(true);
    setTemplateFileName(file.name);

    try {
      const result: UploadResult = await fn_upload_template_file(file);
      setFileId(result.id);
      toast.success('Archivo PDF de plantilla subido correctamente');
    } catch (error: any) {
      console.error('Error al subir archivo de plantilla:', error);
      setFileId(null);
      toast.error(error?.message || 'No se pudo subir el archivo PDF de plantilla');
    } finally {
      setUploadingTemplate(false);
    }
  };

  // 🔹 Subida del PDF asociado (prev_file_id)
  const handlePreviewFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPreview(true);
    setPreviewError(null);
    setPreviewFileName(file.name);

    try {
      const result: UploadResult = await fn_upload_preview_image(file);
      setPrevFileId(result.id);
      toast.success('Archivo PDF asociado subido correctamente');
    } catch (error: any) {
      console.error('Error al subir PDF asociado:', error);
      setPrevFileId(null);
      setPreviewSrc(null);
      setPreviewKind(null);
      setPreviewError(error?.message || 'No se pudo subir el archivo PDF asociado');
    } finally {
      setUploadingPreview(false);
    }
  };

  // 🔹 Vista previa PLANTILLA PRINCIPAL (fileId)
  useEffect(() => {
    const loadMainPreview = async () => {
      if (!fileId) {
        setMainPreviewSrc(null);
        setMainPreviewKind(null);
        setMainPreviewError(null);
        setMainPreviewLoading(false);
        return;
      }

      setMainPreviewLoading(true);
      setMainPreviewError(null);

      try {
        const preview: FilePreviewResult = await fn_get_file_preview(fileId);

        if (preview.kind === 'image' || preview.kind === 'pdf') {
          setMainPreviewKind(preview.kind);
          setMainPreviewSrc(preview.url);
        } else {
          // kind === 'text' u otros
          setMainPreviewKind('text');
          setMainPreviewSrc(null);
          setMainPreviewError('Tipo de archivo no soportado para previsualización.');
        }
      } catch (error: any) {
        console.error('Error al obtener vista previa de la plantilla:', error);
        setMainPreviewSrc(null);
        setMainPreviewKind(null);
        setMainPreviewError(error?.message || 'Error al obtener vista previa de la plantilla');
      } finally {
        setMainPreviewLoading(false);
      }
    };

    void loadMainPreview();
  }, [fileId]);

  // 🔹 Vista previa PDF asociado (prevFileId)
  useEffect(() => {
    const loadPreview = async () => {
      if (!prevFileId) {
        setPreviewSrc(null);
        setPreviewKind(null);
        setPreviewError(null);
        setPreviewLoading(false);
        return;
      }

      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const preview: FilePreviewResult = await fn_get_file_preview(prevFileId);

        if (preview.kind === 'image' || preview.kind === 'pdf') {
          setPreviewKind(preview.kind);
          setPreviewSrc(preview.url);
        } else {
          setPreviewKind('text');
          setPreviewSrc(null);
          setPreviewError('Tipo de archivo no soportado para previsualización.');
        }
      } catch (error: any) {
        console.error('Error al obtener vista previa:', error);
        setPreviewSrc(null);
        setPreviewKind(null);
        setPreviewError(error?.message || 'Error al obtener vista previa');
      } finally {
        setPreviewLoading(false);
      }
    };

    void loadPreview();
  }, [prevFileId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateData.code.trim()) {
      toast.error('El código de la plantilla es obligatorio');
      return;
    }

    if (!templateData.name.trim()) {
      toast.error('El nombre de la plantilla es obligatorio');
      return;
    }

    if (!templateData.document_type_id) {
      toast.error('Debes elegir un tipo de documento');
      return;
    }

    if (!templateData.category_id) {
      toast.error('Debes elegir una categoría');
      return;
    }

    if (!fileId) {
      toast.error('Debes subir el archivo PDF de la plantilla');
      return;
    }

    if (!prevFileId) {
      toast.error('Debes subir el PDF asociado');
      return;
    }

    const selectedDocType = documentTypes.find((dt) => dt.id === templateData.document_type_id);
    const selectedCategory = categories.find((c) => c.id === Number(templateData.category_id));

    if (!selectedDocType) {
      toast.error('Tipo de documento seleccionado no es válido');
      return;
    }

    if (!selectedCategory) {
      toast.error('Categoría seleccionada no es válida');
      return;
    }

    setIsSubmitting(true);

    try {
      const body: Parameters<FnCreateDocumentTemplate>[0] = {
        doc_type_code: selectedDocType.code,
        doc_category_code: selectedCategory.code,
        code: templateData.code,
        name: templateData.name,
        description: templateData.description,
        file_id: fileId,
        prev_file_id: prevFileId,
        is_active: true,
      };

      const result = await fn_create_document_template(body);

      toast.success(result.message || 'Plantilla creada con éxito');

      router.push('/main/templates');
    } catch (error: any) {
      console.error('Error al crear la plantilla:', error);
      toast.error(error?.message || 'Ocurrió un error al crear la plantilla');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDocType = documentTypes.find((dt) => dt.id === templateData.document_type_id);
  const selectedCategory = categories.find((c) => c.id === Number(templateData.category_id));
  const isLoadingCatalogs = loadingDocTypes || loadingCategories;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => router.back()} className="hover:bg-muted p-2 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-bold text-foreground text-3xl">Crear Plantilla</h1>
          <p className="text-muted-foreground">Diseña una nueva plantilla de certificado, constancia o reconocimiento</p>
          {isLoadingCatalogs && (
            <p className="flex items-center gap-2 text-muted-foreground text-xs mt-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Cargando catálogos...
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-6 p-6 border-border">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground text-lg">Información Básica</h3>

            <div className="gap-4 grid md:grid-cols-2">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="font-medium text-foreground text-sm">Código de la Plantilla</label>
                  {/* Popover de ayuda */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0 text-muted-foreground">
                        <Info className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 text-xs space-y-1">
                      <p className="font-semibold">Sugerencias para el código</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Debe ser único (no repetido).</li>
                        <li>Usa mayúsculas y guiones bajos.</li>
                        <li>
                          Ejemplo: <span className="font-mono">CERT_CURSO_BASICO</span>
                        </li>
                      </ul>
                    </PopoverContent>
                  </Popover>
                </div>
                <Input
                  type="text"
                  name="code"
                  placeholder="Ej: CERT_CURSO_BASICO"
                  value={templateData.code}
                  onChange={handleInputChange}
                  required
                  className="bg-muted border-border"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-foreground text-sm">Nombre de la Plantilla</label>
                <Input
                  type="text"
                  name="name"
                  placeholder="Ej: Certificado Taller Go 2025"
                  value={templateData.name}
                  onChange={handleInputChange}
                  required
                  className="bg-muted border-border"
                />
              </div>
            </div>

            <div className="gap-4 grid md:grid-cols-2">
              {/* Tipo de documento (Popover + Command) */}
              <div className="space-y-2">
                <label className="block font-medium text-foreground text-sm">Tipo de Documento</label>
                <Popover
                  open={openTypePopover}
                  onOpenChange={(open) => {
                    setOpenTypePopover(open);
                    if (open) {
                      void loadDocumentTypes(typeSearch, false);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" role="combobox" aria-expanded={openTypePopover} className="justify-between w-full" disabled={loadingDocTypes}>
                      {selectedDocType ? `${selectedDocType.name} (${selectedDocType.code})` : 'Selecciona un tipo...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Buscar tipo..."
                        value={typeSearch}
                        onValueChange={(value) => {
                          setTypeSearch(value);
                          void loadDocumentTypes(value, false);
                        }}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron tipos</CommandEmpty>
                        <CommandGroup>
                          {documentTypes.map((dt) => (
                            <CommandItem
                              key={dt.id}
                              value={`${dt.name} (${dt.code})`}
                              onSelect={() => {
                                setTemplateData((prev) => ({
                                  ...prev,
                                  document_type_id: dt.id,
                                  category_id: '', // reset categoría al cambiar tipo
                                }));
                                setCategories([]);
                                setCategorySearch('');
                                setOpenTypePopover(false);
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${dt.id === templateData.document_type_id ? 'opacity-100' : 'opacity-0'}`} />
                              {dt.name} ({dt.code})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Categoría (Popover + Command) */}
              <div className="space-y-2">
                <label className="block font-medium text-foreground text-sm">Categoría</label>
                <Popover
                  open={openCategoryPopover}
                  onOpenChange={(open) => {
                    if (open && !templateData.document_type_id) {
                      toast.error('Primero selecciona un tipo de documento');
                      return;
                    }
                    setOpenCategoryPopover(open);
                    if (open) {
                      void loadCategories(categorySearch, false);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCategoryPopover}
                      className="justify-between w-full"
                      disabled={loadingCategories || !templateData.document_type_id}
                    >
                      {selectedCategory ? `${selectedCategory.name} (${selectedCategory.code})` : 'Selecciona una categoría...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Buscar categoría..."
                        value={categorySearch}
                        onValueChange={(value) => {
                          setCategorySearch(value);
                          void loadCategories(value, false);
                        }}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron categorías</CommandEmpty>
                        <CommandGroup>
                          {categories.map((cat) => (
                            <CommandItem
                              key={cat.id}
                              value={`${cat.name} (${cat.code})`}
                              onSelect={() => {
                                setTemplateData((prev) => ({
                                  ...prev,
                                  category_id: cat.id.toString(),
                                }));
                                setOpenCategoryPopover(false);
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${cat.id === Number(templateData.category_id) ? 'opacity-100' : 'opacity-0'}`} />
                              {cat.name} ({cat.code})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <label className="block mb-2 font-medium text-foreground text-sm">Descripción</label>
              <textarea
                name="description"
                placeholder="Describe el propósito de esta plantilla..."
                value={templateData.description}
                onChange={handleInputChange}
                className="bg-muted px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full text-foreground"
                rows={3}
              />
            </div>
          </div>

          {/* Archivos asociados */}
          <div className="space-y-4 pt-6 border-border border-t">
            <h3 className="font-semibold text-foreground text-lg">Archivos asociados (PDF)</h3>
            <p className="text-muted-foreground text-sm">
              Sube el archivo PDF de la plantilla principal (<span className="font-mono">file_id</span>) y un PDF asociado (<span className="font-mono">prev_file_id</span>). La
              plantilla principal se muestra como <span className="font-semibold">previsualización de ejemplo</span>.
            </p>

            <div className="gap-4 grid md:grid-cols-2">
              {/* Plantilla principal PDF */}
              <div className="space-y-2">
                <label className="block mb-1 font-medium text-foreground text-sm">
                  Plantilla principal (PDF) * (<span className="font-mono">file_id</span>)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleTemplateFileChange}
                    disabled={uploadingTemplate || isSubmitting}
                    className="bg-muted border-border"
                  />
                </div>
                <p className="flex items-center gap-1 text-muted-foreground text-xs">
                  <FileText className="w-3 h-3" />
                  Esta es la plantilla base en PDF. Se mostrará como <span className="font-semibold">previsualización de ejemplo</span>.
                </p>
                {uploadingTemplate && (
                  <p className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Subiendo archivo...
                  </p>
                )}
                {templateFileName && fileId && (
                  <p className="text-muted-foreground text-xs">
                    Archivo: <span className="font-medium">{templateFileName}</span>
                    <br />
                    ID: <span className="font-mono text-[11px]">{fileId}</span>
                  </p>
                )}

                {/* Previsualización de ejemplo */}
                <div className="relative flex justify-center items-center bg-muted mt-2 border border-border border-dashed rounded-lg w-full h-40 overflow-hidden">
                  {!fileId ? (
                    <div className="flex flex-col justify-center items-center gap-1 text-muted-foreground text-xs">
                      <Info className="w-4 h-4" />
                      <span>Sin plantilla para previsualizar</span>
                    </div>
                  ) : mainPreviewLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cargando previsualización de ejemplo...</span>
                    </div>
                  ) : mainPreviewError || !mainPreviewSrc ? (
                    <div className="flex flex-col justify-center items-center gap-1 text-muted-foreground text-xs">
                      <Info className="w-4 h-4" />
                      <span>{mainPreviewError || 'Recurso no disponible'}</span>
                    </div>
                  ) : mainPreviewKind === 'image' ? (
                    <Image src={mainPreviewSrc} alt="Previsualización de ejemplo" fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
                  ) : mainPreviewKind === 'pdf' ? (
                    <iframe src={mainPreviewSrc} title="Previsualización de ejemplo (PDF)" className="w-full h-full" />
                  ) : (
                    <div className="flex flex-col justify-center items-center gap-1 text-muted-foreground text-xs">
                      <Info className="w-4 h-4" />
                      <span>Tipo de archivo no soportado para previsualización.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* PDF asociado (prev_file_id) */}
              <div className="space-y-2">
                <label className="block mb-1 font-medium text-foreground text-sm">
                  PDF asociado * (<span className="font-mono">prev_file_id</span>)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handlePreviewFileChange}
                    disabled={uploadingPreview || isSubmitting}
                    className="bg-muted border-border"
                  />
                </div>
                <p className="flex items-center gap-1 text-muted-foreground text-xs">
                  <FileType className="w-3 h-3" />
                  Este PDF se usará como referencia o respaldo de la plantilla.
                </p>
                {uploadingPreview && (
                  <p className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Subiendo PDF...
                  </p>
                )}
                {previewFileName && prevFileId && (
                  <p className="text-muted-foreground text-xs">
                    Archivo: <span className="font-medium">{previewFileName}</span>
                    <br />
                    ID: <span className="font-mono text-[11px]">{prevFileId}</span>
                  </p>
                )}

                {/* Caja de previsualización PDF asociado */}
                <div className="relative flex justify-center items-center bg-muted mt-2 border border-border border-dashed rounded-lg w-full h-40 overflow-hidden">
                  {!prevFileId ? (
                    <div className="flex flex-col justify-center items-center gap-1 text-muted-foreground text-xs">
                      <Info className="w-4 h-4" />
                      <span>Sin archivo para previsualizar</span>
                    </div>
                  ) : previewLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cargando vista previa...</span>
                    </div>
                  ) : previewError || !previewSrc ? (
                    <div className="flex flex-col justify-center items-center gap-1 text-muted-foreground text-xs">
                      <Info className="w-4 h-4" />
                      <span>{previewError || 'Recurso no disponible'}</span>
                    </div>
                  ) : previewKind === 'image' ? (
                    <Image src={previewSrc} alt="Vista previa PDF asociado" fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
                  ) : previewKind === 'pdf' ? (
                    <iframe src={previewSrc} title="Vista previa PDF asociado" className="w-full h-full" />
                  ) : (
                    <div className="flex flex-col justify-center items-center gap-1 text-muted-foreground text-xs">
                      <Info className="w-4 h-4" />
                      <span>Tipo de archivo no soportado para previsualización.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-white" disabled={isSubmitting || isLoadingCatalogs}>
            {isSubmitting ? 'Creando...' : 'Crear Plantilla'}
          </Button>
        </div>
      </form>
    </div>
  );
}
