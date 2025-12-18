import type { FC } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { FileText, FileType, Info, Loader2 } from 'lucide-react';

import type { PreviewKind } from './new-template-types';

export interface NewTemplateFilesSectionProps {
  fileId: string | null;
  prevFileId: string | null;
  templateFileName: string | null;
  previewFileName: string | null;
  uploadingTemplate: boolean;
  uploadingPreview: boolean;
  mainPreviewSrc: string | null;
  mainPreviewKind: PreviewKind;
  mainPreviewLoading: boolean;
  mainPreviewError: string | null;
  previewSrc: string | null;
  previewKind: PreviewKind;
  previewLoading: boolean;
  previewError: string | null;
  isSubmitting: boolean;
  onTemplateFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPreviewFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const NewTemplateFilesSection: FC<NewTemplateFilesSectionProps> = ({
  fileId,
  prevFileId,
  templateFileName,
  previewFileName,
  uploadingTemplate,
  uploadingPreview,
  mainPreviewSrc,
  mainPreviewKind,
  mainPreviewLoading,
  mainPreviewError,
  previewSrc,
  previewKind,
  previewLoading,
  previewError,
  isSubmitting,
  onTemplateFileChange,
  onPreviewFileChange,
}) => {
  return (
    <div className="space-y-4 pt-6 border-border border-t">
      <h3 className="font-semibold text-foreground text-lg">Archivos asociados (PDF)</h3>
      <p className="text-muted-foreground text-sm">
        Sube el archivo PDF de la plantilla principal y un PDF asociado. La plantilla principal se muestra como <span className="font-semibold">previsualización de ejemplo</span>.
      </p>

      <div className="gap-4 grid md:grid-cols-2">
        <div className="space-y-2">
          <label className="block mb-1 font-medium text-foreground text-sm">Plantilla principal (PDF) *</label>
          <div className="flex items-center gap-2">
            <Input type="file" accept="application/pdf,.pdf" onChange={onTemplateFileChange} disabled={uploadingTemplate || isSubmitting} className="bg-muted border-border" />
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

        <div className="space-y-2">
          <label className="block mb-1 font-medium text-foreground text-sm">PDF asociado *</label>
          <div className="flex items-center gap-2">
            <Input type="file" accept="application/pdf,.pdf" onChange={onPreviewFileChange} disabled={uploadingPreview || isSubmitting} className="bg-muted border-border" />
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
  );
};
