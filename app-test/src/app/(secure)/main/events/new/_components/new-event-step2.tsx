import type { FC } from 'react';
import Image from 'next/image';

import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

import type { DocumentTemplateItem } from '@/actions/fn-doc-template';
import type { TemplatePreviewState } from './new-event-types';

export interface NewEventStep2Props {
  templates: DocumentTemplateItem[];
  templateId: string | null;
  loadingTemplates: boolean;
  preview: TemplatePreviewState;
  previewFileId: string | null;
  onLoadTemplates: () => void;
  onChangeTemplate: (value: string) => void;
}

export const NewEventStep2: FC<NewEventStep2Props> = ({ templates, templateId, loadingTemplates, preview, onLoadTemplates, onChangeTemplate }) => {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">Plantilla asociada</h2>

      <div className="flex flex-col gap-2">
        <Label>Plantilla (certificado / documento) *</Label>
        <Select value={templateId ?? 'none'} onOpenChange={(open) => open && onLoadTemplates()} onValueChange={onChangeTemplate}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una plantilla" />
          </SelectTrigger>

          <SelectContent>
            {loadingTemplates ? (
              <div className="flex justify-center items-center p-4 text-muted-foreground text-xs">
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Cargando...
              </div>
            ) : (
              <>
                <SelectItem value="none">Sin plantilla</SelectItem>
                {templates.map((tmpl) => (
                  <SelectItem key={tmpl.id} value={tmpl.id}>
                    {tmpl.name} ({tmpl.code})
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-2 flex flex-col items-stretch md:h-[70vh]">
        <Label className="text-xs mb-1 self-start">Previsualización del documento</Label>

        <div className="flex-1 bg-muted border border-dashed border-border rounded-md w-full overflow-hidden flex items-center justify-center">
          {!templateId ? (
            <p className="text-xs text-muted-foreground">Selecciona una plantilla para ver su previsualización.</p>
          ) : preview.loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Cargando vista previa...</span>
            </div>
          ) : preview.error ? (
            <p className="text-xs text-muted-foreground">{preview.error}</p>
          ) : !preview.src ? (
            <p className="text-xs text-muted-foreground">No hay vista previa disponible.</p>
          ) : preview.kind === 'pdf' ? (
            <iframe src={preview.src} title="Vista previa del documento" className="w-full h-full" />
          ) : preview.kind === 'image' ? (
            <Image src={preview.src} alt="Vista previa del documento" className="object-contain w-full h-full" width={800} height={600} />
          ) : (
            <p className="text-xs text-muted-foreground">Tipo de archivo no soportado.</p>
          )}
        </div>
      </div>
    </div>
  );
};
