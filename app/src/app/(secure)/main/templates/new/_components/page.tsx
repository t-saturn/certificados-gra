/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { fn_upload_template_file, fn_upload_preview_image, type UploadResult } from '@/actions/fn-file-upload';
import { fn_get_file_preview, type FilePreviewResult } from '@/actions/fn-file-preview';
import { fn_get_document_types } from '@/actions/fn-doc-type';
import { fn_get_document_categories } from '@/actions/fn-doc-category';
import { fn_create_document_template, type FnCreateDocumentTemplate } from '@/actions/fn-doc-template';

import { type TemplateFormState, type DocTypeOption, type CategoryOption, type PreviewKind } from './new-template-types';
import { NewTemplateHeader } from './new-template-header';
import { NewTemplateBasicInfo } from './new-template-basic-info';
import { NewTemplateFilesSection } from './new-template-files-section';

const NewTemplatePage: React.FC = () => {
  const router = useRouter();

  const [docTypeOptions, setDocTypeOptions] = useState<DocTypeOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [loadingDocTypes, setLoadingDocTypes] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [templateData, setTemplateData] = useState<TemplateFormState>({ code: '', name: '', document_type_id: '', category_id: '', description: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fileId, setFileId] = useState<string | null>(null);
  const [prevFileId, setPrevFileId] = useState<string | null>(null);
  const [templateFileName, setTemplateFileName] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);

  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);

  const [mainPreviewSrc, setMainPreviewSrc] = useState<string | null>(null);
  const [mainPreviewKind, setMainPreviewKind] = useState<PreviewKind>(null);
  const [mainPreviewLoading, setMainPreviewLoading] = useState(false);
  const [mainPreviewError, setMainPreviewError] = useState<string | null>(null);

  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<PreviewKind>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const isLoadingCatalogs = loadingDocTypes || loadingCategories;

  const loadDocumentTypes = async (searchQuery: string, autoSelectFirst = false): Promise<void> => {
    setLoadingDocTypes(true);
    try {
      const params: any = { page: 1, page_size: 50, is_active: true };
      if (searchQuery.trim()) {
        params.search_query = searchQuery.trim();
      }

      const dtResult = await fn_get_document_types(params);

      const mapped: DocTypeOption[] = dtResult.items.map((dt) => ({ id: dt.id, code: dt.code, name: dt.name }));

      setDocTypeOptions(mapped);

      if (autoSelectFirst && mapped.length > 0 && !templateData.document_type_id) {
        setTemplateData((prev) => ({ ...prev, document_type_id: mapped[0].id }));
      }
    } catch (error: any) {
      console.error('Error al cargar tipos de documento:', error);
      toast.error(error?.message || 'Error al cargar los tipos de documento');
      setDocTypeOptions([]);
    } finally {
      setLoadingDocTypes(false);
    }
  };

  const loadCategories = async (searchQuery: string, autoSelectFirst = false): Promise<void> => {
    const selectedDocType = docTypeOptions.find((dt) => dt.id === templateData.document_type_id);

    if (!selectedDocType) {
      setCategoryOptions([]);
      if (autoSelectFirst) setTemplateData((prev) => ({ ...prev, category_id: '' }));

      return;
    }

    setLoadingCategories(true);
    try {
      const params: any = { page: 1, page_size: 50, is_active: true, doc_type_code: selectedDocType.code };
      if (searchQuery.trim()) params.search_query = searchQuery.trim();

      const catResult = await fn_get_document_categories(params);

      const mapped: CategoryOption[] = catResult.items.map((cat) => ({ id: cat.id, code: cat.code, name: cat.name }));

      setCategoryOptions(mapped);

      if (autoSelectFirst && !templateData.category_id && mapped.length > 0) setTemplateData((prev) => ({ ...prev, category_id: mapped[0].id.toString() }));
    } catch (error: any) {
      console.error('Error al cargar categorías:', error);
      toast.error(error?.message || 'Error al cargar las categorías');
      setCategoryOptions([]);
      setTemplateData((prev) => ({ ...prev, category_id: '' }));
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    void loadDocumentTypes('', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (templateData.document_type_id) void loadCategories('', true);
    else {
      setCategoryOptions([]);
      setTemplateData((prev) => ({ ...prev, category_id: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateData.document_type_id]);

  /* -------- handlers de formulario -------- */

  const handleTemplateDataChange = (changes: Partial<TemplateFormState>): void => {
    setTemplateData((prev) => ({ ...prev, ...changes }));
  };

  const handleDescriptionChange = (value: string): void => {
    handleTemplateDataChange({ description: value });
  };

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

  // preview plantilla principal
  useEffect(() => {
    const loadMainPreview = async (): Promise<void> => {
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

  useEffect(() => {
    const loadPreview = async (): Promise<void> => {
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

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
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

    const selectedDocType = docTypeOptions.find((dt) => dt.id === templateData.document_type_id);
    const selectedCategory = categoryOptions.find((c) => c.id === Number(templateData.category_id));

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

  const selectedDocType = docTypeOptions.find((dt) => dt.id === templateData.document_type_id);
  const selectedCategory = categoryOptions.find((c) => c.id === Number(templateData.category_id));

  return (
    <div className="space-y-6 p-6">
      <NewTemplateHeader onBack={() => router.back()} isLoadingCatalogs={isLoadingCatalogs} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-6 p-6 border-border">
          <NewTemplateBasicInfo
            templateData={templateData}
            docTypeOptions={docTypeOptions}
            categoryOptions={categoryOptions}
            loadingDocTypes={loadingDocTypes}
            loadingCategories={loadingCategories}
            selectedDocType={selectedDocType}
            selectedCategory={selectedCategory}
            onTemplateDataChange={handleTemplateDataChange}
            onRequestLoadDocTypes={(search) => {
              void loadDocumentTypes(search, false);
            }}
            onRequestLoadCategories={(search) => {
              void loadCategories(search, false);
            }}
            onDescriptionChange={handleDescriptionChange}
          />

          <NewTemplateFilesSection
            fileId={fileId}
            prevFileId={prevFileId}
            templateFileName={templateFileName}
            previewFileName={previewFileName}
            uploadingTemplate={uploadingTemplate}
            uploadingPreview={uploadingPreview}
            mainPreviewSrc={mainPreviewSrc}
            mainPreviewKind={mainPreviewKind}
            mainPreviewLoading={mainPreviewLoading}
            mainPreviewError={mainPreviewError}
            previewSrc={previewSrc}
            previewKind={previewKind}
            previewLoading={previewLoading}
            previewError={previewError}
            isSubmitting={isSubmitting}
            onTemplateFileChange={handleTemplateFileChange}
            onPreviewFileChange={handlePreviewFileChange}
          />
        </Card>

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
};

export default NewTemplatePage;
