import type { FC } from 'react';
import Image from 'next/image';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Info, Edit2, Trash2 } from 'lucide-react';

import type { DocumentTemplateItem } from '@/actions/fn-doc-template';
import type { TemplatePreviewState } from './template-types';

export interface TemplatesListProps {
  templates: DocumentTemplateItem[];
  previewMap: Record<string, TemplatePreviewState>;
  disablingId: string | null;
  onOpenEdit: (template: DocumentTemplateItem) => void;
  onDisable: (id: string) => void;
  onOpenPreview: (templateId: string, title: string) => void;
  formatDate: (iso: string) => string;
}

export const TemplatesList: FC<TemplatesListProps> = ({ templates, previewMap, disablingId, onOpenEdit, onDisable, onOpenPreview, formatDate }) => {
  return (
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
                      onOpenPreview(template.id, template.name);
                    }}
                    onKeyDown={(e) => {
                      if (!hasPreview) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenPreview(template.id, template.name);
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
                <Button variant="ghost" size="sm" className="flex-1 gap-2 text-muted-foreground hover:text-foreground" onClick={() => onOpenEdit(template)}>
                  <Edit2 className="w-4 h-4" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 gap-2 text-destructive hover:text-destructive/80"
                  onClick={() => onDisable(template.id)}
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
  );
};
