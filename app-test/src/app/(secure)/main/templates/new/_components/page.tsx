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

import { type TemplateFormState, type DocTypeOption, type CategoryOption, type PreviewKind, type TemplateFieldForm } from './new-template-types';

import { NewTemplateHeader } from './new-template-header';
import { NewTemplateBasicInfo } from './new-template-basic-info';
import { NewTemplateFilesSection } from './new-template-files-section';
import { NewTemplateFieldsSection } from './new-template-fields-section';

const NewTemplatePage: React.FC = () => {
  const router = useRouter();

  /* ---------- catálogos ---------- */
  const [docTypeOptions, setDocTypeOptions] = useState<DocTypeOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [loadingDocTypes, setLoadingDocTypes] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  /* ---------- datos base ---------- */
  const [templateData, setTemplateData] = useState<TemplateFormState>({
    code: '',
    name: '',
    document_type_id: '',
    category_id: '',
  });

  /* ---------- variables ---------- */
  const [fields, setFields] = useState<TemplateFieldForm[]>([]);

  /* ---------- archivos ---------- */
  const [fileId, setFileId] = useState<string | null>(null);
  const [prevFileId, setPrevFileId] = useState<string | null>(null);
  const [templateFileName, setTemplateFileName] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);

  /* ---------- previews ---------- */
  const [mainPreviewSrc, setMainPreviewSrc] = useState<string | null>(null);
  const [mainPreviewKind, setMainPreviewKind] = useState<PreviewKind>(null);
  const [mainPreviewLoading, setMainPreviewLoading] = useState(false);
  const [mainPreviewError, setMainPreviewError] = useState<string | null>(null);

  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<PreviewKind>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLoadingCatalogs = loadingDocTypes || loadingCategories;

  /* ---------- loaders ---------- */

  const loadDocumentTypes = async (searchQuery = '', autoSelectFirst = false): Promise<void> => {
    setLoadingDocTypes(true);
    try {
      const res = await fn_get_document_types({
        page: 1,
        page_size: 50,
        is_active: true,
        search_query: searchQuery || undefined,
      });

      const mapped = res.items.map((dt) => ({ id: dt.id, code: dt.code, name: dt.name }));
      setDocTypeOptions(mapped);

      if (autoSelectFirst && mapped.length > 0 && !templateData.document_type_id) {
        setTemplateData((p) => ({ ...p, document_type_id: mapped[0].id }));
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al cargar tipos de documento');
    } finally {
      setLoadingDocTypes(false);
    }
  };

  const loadCategories = async (searchQuery = '', autoSelectFirst = false): Promise<void> => {
    const dt = docTypeOptions.find((d) => d.id === templateData.document_type_id);
    if (!dt) return;

    setLoadingCategories(true);
    try {
      const res = await fn_get_document_categories({
        page: 1,
        page_size: 50,
        is_active: true,
        doc_type_code: dt.code,
        search_query: searchQuery || undefined,
      });

      const mapped = res.items.map((c) => ({ id: c.id, code: c.code, name: c.name }));
      setCategoryOptions(mapped);

      if (autoSelectFirst && mapped.length > 0 && !templateData.category_id) {
        setTemplateData((p) => ({ ...p, category_id: String(mapped[0].id) }));
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al cargar categorías');
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
    else setCategoryOptions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateData.document_type_id]);

  /* ---------- handlers ---------- */

  const handleTemplateFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTemplate(true);
    setTemplateFileName(file.name);

    try {
      const result: UploadResult = await fn_upload_template_file(file);
      setFileId(result.id);
      toast.success('Plantilla subida');
    } catch (err: any) {
      toast.error(err?.message || 'Error al subir plantilla');
      setFileId(null);
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handlePreviewFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPreview(true);
    setPreviewFileName(file.name);

    try {
      const result: UploadResult = await fn_upload_preview_image(file);
      setPrevFileId(result.id);
      toast.success('PDF asociado subido');
    } catch (err: any) {
      toast.error(err?.message || 'Error al subir PDF asociado');
      setPrevFileId(null);
    } finally {
      setUploadingPreview(false);
    }
  };

  /* ---------- previews (FIX union type) ---------- */

  useEffect(() => {
    const load = async (): Promise<void> => {
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
        const p: FilePreviewResult = await fn_get_file_preview(fileId);

        if (p.kind === 'image' || p.kind === 'pdf') {
          setMainPreviewKind(p.kind);
          setMainPreviewSrc(p.url);
        } else {
          setMainPreviewKind('text');
          setMainPreviewSrc(null);
          setMainPreviewError('Tipo de archivo no soportado para previsualización.');
        }
      } catch {
        setMainPreviewSrc(null);
        setMainPreviewKind(null);
        setMainPreviewError('Error al cargar preview');
      } finally {
        setMainPreviewLoading(false);
      }
    };

    void load();
  }, [fileId]);

  useEffect(() => {
    const load = async (): Promise<void> => {
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
        const p: FilePreviewResult = await fn_get_file_preview(prevFileId);

        if (p.kind === 'image' || p.kind === 'pdf') {
          setPreviewKind(p.kind);
          setPreviewSrc(p.url);
        } else {
          setPreviewKind('text');
          setPreviewSrc(null);
          setPreviewError('Tipo de archivo no soportado para previsualización.');
        }
      } catch {
        setPreviewSrc(null);
        setPreviewKind(null);
        setPreviewError('Error al cargar preview');
      } finally {
        setPreviewLoading(false);
      }
    };

    void load();
  }, [prevFileId]);

  /* ---------- submit ---------- */

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!templateData.code.trim() || !templateData.name.trim()) {
      toast.error('Código y nombre son obligatorios');
      return;
    }
    if (!templateData.document_type_id || !templateData.category_id) {
      toast.error('Selecciona tipo y categoría');
      return;
    }
    if (!fileId || !prevFileId) {
      toast.error('Debes subir ambos PDFs');
      return;
    }

    // validar fields
    const keys = new Set<string>();
    for (const f of fields) {
      if (!f.key.trim() || !f.label.trim()) {
        toast.error('Todas las variables deben tener key y etiqueta');
        return;
      }
      const k = f.key.trim();
      if (keys.has(k)) {
        toast.error(`Key duplicada: ${k}`);
        return;
      }
      keys.add(k);
    }

    const dt = docTypeOptions.find((d) => d.id === templateData.document_type_id);
    const cat = categoryOptions.find((c) => c.id === Number(templateData.category_id));

    if (!dt || !cat) {
      toast.error('Tipo o categoría inválidos');
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Parameters<FnCreateDocumentTemplate>[0] = {
        doc_type_code: dt.code,
        doc_category_code: cat.code,
        code: templateData.code.trim(),
        name: templateData.name.trim(),
        file_id: fileId,
        prev_file_id: prevFileId,
        is_active: true,
        fields,
      };

      const res = await fn_create_document_template(body);

      toast.success(res.message || 'Plantilla creada');
      router.push('/main/templates');
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear plantilla');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <NewTemplateHeader onBack={() => router.back()} isLoadingCatalogs={isLoadingCatalogs} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-6 p-6">
          <NewTemplateBasicInfo
            templateData={templateData}
            docTypeOptions={docTypeOptions}
            categoryOptions={categoryOptions}
            loadingDocTypes={loadingDocTypes}
            loadingCategories={loadingCategories}
            selectedDocType={docTypeOptions.find((d) => d.id === templateData.document_type_id)}
            selectedCategory={categoryOptions.find((c) => c.id === Number(templateData.category_id))}
            onTemplateDataChange={(c) => setTemplateData((p) => ({ ...p, ...c }))}
            onRequestLoadDocTypes={(s) => void loadDocumentTypes(s, false)}
            onRequestLoadCategories={(s) => void loadCategories(s, false)}
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

          <NewTemplateFieldsSection fields={fields} onChange={setFields} disabled={isSubmitting} />
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || isLoadingCatalogs}>
            {isSubmitting ? 'Creando…' : 'Crear Plantilla'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewTemplatePage;
