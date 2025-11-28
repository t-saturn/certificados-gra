/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import type React from 'react';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Info, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

import { fn_create_template, type FnCreateTemplate } from '@/actions/fn-template';
import { fn_upload_template_file, fn_upload_preview_image, type UploadResult } from '@/actions/fn-file-upload';
import { fn_get_file_preview, type FilePreviewResult } from '@/actions/fn-file-preview';

// ---- Datos catálogos (según tus capturas) ----
const DOCUMENT_TYPES = [
  {
    id: '0a64ebf7-34a1-47d7-b0b1-208863f53e1d',
    code: 'CERTIFICATE',
    label: 'Certificado',
  },
  {
    id: 'ee9760e8-56a0-469a-9ad6-7f98649ec7a6',
    code: 'CONSTANCY',
    label: 'Constancia',
  },
  {
    id: '09c38888-6ac4-4b1a-9189-ab5abb94d1fd',
    code: 'RECOGNITION',
    label: 'Reconocimiento',
  },
];

const CATEGORIES = [
  {
    id: 1,
    document_type_id: '0a64ebf7-34a1-47d7-b0b1-208863f53e1d',
    label: 'trabajo',
  },
  {
    id: 2,
    document_type_id: '0a64ebf7-34a1-47d7-b0b1-208863f53e1d',
    label: 'sgd',
  },
];

type TemplateFormState = {
  name: string;
  document_type_id: string;
  category_id: string; // luego lo parseamos a number
  description: string;
};

export default function NewTemplatePage() {
  const router = useRouter();

  const defaultType = DOCUMENT_TYPES[0]?.id ?? '';
  const defaultCategories = CATEGORIES.filter((c) => c.document_type_id === defaultType);
  const defaultCategory = defaultCategories[0]?.id?.toString() ?? '';

  const [templateData, setTemplateData] = useState<TemplateFormState>({
    name: '',
    document_type_id: defaultType,
    category_id: defaultCategory,
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- estado de archivos subidos ----
  const [fileId, setFileId] = useState<string | null>(null); // plantilla HTML
  const [prevFileId, setPrevFileId] = useState<string | null>(null); // imagen
  const [templateFileName, setTemplateFileName] = useState<string | null>(null);

  // ---- estado de subida ----
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);

  // ---- estado de previsualización de imagen (desde prev_file_id) ----
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as any;

    if (name === 'document_type_id') {
      const newTypeId = value;
      const availableCategories = CATEGORIES.filter((c) => c.document_type_id === newTypeId);

      setTemplateData((prev) => ({
        ...prev,
        document_type_id: newTypeId,
        category_id: availableCategories[0]?.id?.toString() ?? '',
      }));

      return;
    }

    setTemplateData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 🔹 Subida del archivo de plantilla (HTML)
  const handleTemplateFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTemplate(true);
    setTemplateFileName(file.name);

    try {
      const result: UploadResult = await fn_upload_template_file(file);
      setFileId(result.id);
      toast.success('Archivo de plantilla subido correctamente');
    } catch (error: any) {
      console.error('Error al subir archivo de plantilla:', error);
      setFileId(null);
      toast.error(error?.message || 'No se pudo subir el archivo de plantilla');
    } finally {
      setUploadingTemplate(false);
    }
  };

  // 🔹 Subida de la imagen (prev_file_id)
  //     La vista previa se cargará automáticamente vía useEffect cuando cambie prevFileId.
  const handlePreviewFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPreview(true);
    setPreviewError(null);

    try {
      const result: UploadResult = await fn_upload_preview_image(file);
      setPrevFileId(result.id);
      toast.success('Imagen de previsualización subida correctamente');
    } catch (error: any) {
      console.error('Error al subir imagen de previsualización:', error);
      setPrevFileId(null);
      setPreviewSrc(null);
      setPreviewError(error?.message || 'No se pudo subir la imagen de previsualización');
    } finally {
      setUploadingPreview(false);
    }
  };

  // 🔹 Cada vez que cambie prevFileId, obtenemos la vista previa desde el file-server
  useEffect(() => {
    const loadPreview = async () => {
      if (!prevFileId) {
        setPreviewSrc(null);
        setPreviewError(null);
        setPreviewLoading(false);
        return;
      }

      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const preview: FilePreviewResult = await fn_get_file_preview(prevFileId);

        if (preview.kind === 'image') {
          setPreviewSrc(preview.url);
        } else {
          setPreviewSrc(null);
          setPreviewError('Tipo de archivo no soportado para previsualización (solo imágenes).');
        }
      } catch (error: any) {
        console.error('Error al obtener vista previa:', error);
        setPreviewSrc(null);
        setPreviewError(error?.message || 'Error al obtener vista previa');
      } finally {
        setPreviewLoading(false);
      }
    };

    void loadPreview();
  }, [prevFileId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateData.name.trim()) {
      toast.error('El nombre de la plantilla es obligatorio');
      return;
    }

    if (!templateData.document_type_id) {
      toast.error('Debes elegir un tipo de documento');
      return;
    }

    if (!fileId) {
      toast.error('Debes subir el archivo de la plantilla (HTML)');
      return;
    }

    if (!prevFileId) {
      toast.error('Debes subir la imagen de previsualización');
      return;
    }

    setIsSubmitting(true);

    try {
      const categoryIdNumber = templateData.category_id ? Number(templateData.category_id) : 0;

      const body: Parameters<FnCreateTemplate>[0] = {
        name: templateData.name,
        description: templateData.description,
        document_type_id: templateData.document_type_id,
        category_id: categoryIdNumber,
        is_active: true,
        file_id: fileId,
        prev_file_id: prevFileId,
      };

      const result = await fn_create_template(body);

      toast.success(result.message || 'Plantilla creada con éxito');

      router.push('/main/templates');
    } catch (error: any) {
      console.error('Error al crear la plantilla:', error);
      toast.error(error?.message || 'Ocurrió un error al crear la plantilla');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoriesForSelectedType = CATEGORIES.filter((c) => c.document_type_id === templateData.document_type_id);

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
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-6 p-6 border-border">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground text-lg">Información Básica</h3>

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

            <div className="gap-4 grid md:grid-cols-2">
              <div>
                <label className="block mb-2 font-medium text-foreground text-sm">Tipo de Documento</label>
                <select
                  name="document_type_id"
                  value={templateData.document_type_id}
                  onChange={handleInputChange}
                  className="bg-muted px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full text-foreground"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label} ({type.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 font-medium text-foreground text-sm">Categoría</label>
                <select
                  name="category_id"
                  value={templateData.category_id}
                  onChange={handleInputChange}
                  className="bg-muted px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full text-foreground"
                  disabled={categoriesForSelectedType.length === 0}
                >
                  {categoriesForSelectedType.length === 0 ? (
                    <option value="">Sin categorías disponibles</option>
                  ) : (
                    categoriesForSelectedType.map((cat) => (
                      <option key={cat.id} value={cat.id.toString()}>
                        {cat.label}
                      </option>
                    ))
                  )}
                </select>
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
            <h3 className="font-semibold text-foreground text-lg">Archivos asociados</h3>
            <p className="text-muted-foreground text-sm">
              Sube el archivo HTML de la plantilla (<span className="font-mono">file_id</span>) y una imagen de previsualización (<span className="font-mono">prev_file_id</span>).
              Solo se previsualiza la imagen.
            </p>

            <div className="gap-4 grid md:grid-cols-2">
              {/* Archivo de plantilla HTML */}
              <div className="space-y-2">
                <label className="block mb-1 font-medium text-foreground text-sm">
                  Plantilla HTML * (<span className="font-mono">file_id</span>)
                </label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept=".html,.htm" onChange={handleTemplateFileChange} disabled={uploadingTemplate || isSubmitting} className="bg-muted border-border" />
                </div>
                <p className="flex items-center gap-1 text-muted-foreground text-xs">
                  <FileText className="w-3 h-3" />
                  Sube el archivo HTML base de la plantilla.
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
              </div>

              {/* Imagen de previsualización */}
              <div className="space-y-2">
                <label className="block mb-1 font-medium text-foreground text-sm">
                  Imagen de previsualización * (<span className="font-mono">prev_file_id</span>)
                </label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/*" onChange={handlePreviewFileChange} disabled={uploadingPreview || isSubmitting} className="bg-muted border-border" />
                </div>
                <p className="flex items-center gap-1 text-muted-foreground text-xs">
                  <ImageIcon className="w-3 h-3" />
                  Esta imagen se mostrará como vista previa de la plantilla.
                </p>
                {uploadingPreview && (
                  <p className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Subiendo imagen...
                  </p>
                )}
                {prevFileId && (
                  <p className="text-muted-foreground text-xs">
                    ID: <span className="font-mono text-[11px]">{prevFileId}</span>
                  </p>
                )}

                {/* Caja de previsualización SIEMPRE visible, centrada */}
                <div className="relative flex justify-center items-center bg-muted mt-2 border border-border border-dashed rounded-lg w-full h-40 overflow-hidden">
                  {!prevFileId ? (
                    <div className="flex flex-col justify-center items-center gap-1 text-muted-foreground text-xs">
                      <Info className="w-4 h-4" />
                      <span>Sin imagen de previsualización</span>
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
                  ) : (
                    <Image src={previewSrc} alt="Previsualización de plantilla" fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
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
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-white" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear Plantilla'}
          </Button>
        </div>
      </form>
    </div>
  );
}
