'use client';

import type { FC } from 'react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { Plus, Trash2, Info, AlertTriangle } from 'lucide-react';

import type { TemplateFieldForm, TemplateFieldType } from './new-template-types';

export interface NewTemplateFieldsSectionProps {
  fields: TemplateFieldForm[];
  onChange: (fields: TemplateFieldForm[]) => void;
  disabled?: boolean;
}

const FIELD_TYPE_OPTIONS: { value: TemplateFieldType; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'date', label: 'Fecha' },
  { value: 'number', label: 'Número' },
  { value: 'boolean', label: 'Booleano' },
];

const normalizeKey = (raw: string): string =>
  raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');

export const NewTemplateFieldsSection: FC<NewTemplateFieldsSectionProps> = ({ fields, onChange, disabled }) => {
  const keys = useMemo(() => fields.map((f) => f.key.trim()), [fields]);

  const duplicatedKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const k of keys) {
      if (!k) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return new Set(
      Array.from(counts.entries())
        .filter(([, c]) => c > 1)
        .map(([k]) => k),
    );
  }, [keys]);

  const addField = (): void => {
    const next: TemplateFieldForm[] = [
      ...fields,
      {
        id: crypto.randomUUID(),
        key: '',
        label: '',
        field_type: 'text',
        required: false,
      },
    ];
    onChange(next);
  };

  const removeField = (idx: number): void => {
    const next = fields.filter((_, i) => i !== idx);
    onChange(next);
  };

  const updateField = (idx: number, patch: Partial<TemplateFieldForm>): void => {
    const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    onChange(next);
  };

  const sanitizeKey = (raw: string): string =>
    raw
      .replace(/\s+/g, '') // no espacios
      .replace(/[^a-zA-Z0-9_]/g, ''); // solo letras, números y _

  return (
    <div className="space-y-4 pt-6 border-border border-t">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground text-lg">Variables de la plantilla</h3>
          <p className="text-muted-foreground text-sm">
            Define los placeholders que usará el PDF, por ejemplo: <span className="font-mono">{'{{NOMBRE_PARTICIPANTE}}'}</span>.
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>
              Recomendado: usa <span className="font-semibold">MAYÚSCULAS</span> y <span className="font-semibold">_</span> (ej: <span className="font-mono">FIRMA_1_NOMBRE</span>).
            </span>
          </div>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addField} disabled={disabled} className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar variable
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card className="p-4 border-border bg-muted/40">
          <p className="text-sm text-muted-foreground">Aún no has agregado variables. Si tu plantilla no requiere variables dinámicas, puedes continuar sin agregar.</p>
        </Card>
      ) : null}

      <div className="space-y-3">
        {fields.map((f, idx) => {
          const keySanitized = sanitizeKey(f.key);
          const isDup = keySanitized !== '' && duplicatedKeys.has(keySanitized);
          const isEmptyKey = keySanitized === '';
          const isEmptyLabel = f.label.trim() === '';

          return (
            <Card key={f.id} className="p-4 border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-3 flex-1">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Key</label>
                      <Input
                        value={f.key}
                        disabled={disabled}
                        placeholder="Ej: nombre_participante"
                        onKeyDown={(e) => {
                          if (e.key === ' ') e.preventDefault();
                        }}
                        onChange={(e) => updateField(idx, { key: sanitizeKey(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Placeholder: <span className="font-mono">{`{{${f.key || 'key'}}}`}</span>
                      </p>
                      {(isEmptyKey || isDup) && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {isEmptyKey ? 'Key obligatoria' : 'Key duplicada'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Etiqueta</label>
                      <Input value={f.label} disabled={disabled} placeholder="Ej: Nombre del participante" onChange={(e) => updateField(idx, { label: e.target.value })} className="bg-muted border-border" />
                      {isEmptyLabel && <p className="text-xs text-destructive">Etiqueta obligatoria</p>}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3 items-center">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Tipo</label>
                      <select
                        disabled={disabled}
                        value={f.field_type}
                        onChange={(e) => updateField(idx, { field_type: e.target.value as TemplateFieldType })}
                        className="h-10 w-full rounded-md border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {FIELD_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Requerido</label>
                      <div className="flex items-center gap-2 h-10">
                        <Switch checked={f.required} disabled={disabled} onCheckedChange={(v) => updateField(idx, { required: v })} />
                        <span className="text-sm text-muted-foreground">{f.required ? 'Sí' : 'No'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-start md:justify-end gap-2 h-10">{f.required ? <Badge>Requerido</Badge> : <Badge variant="secondary">Opcional</Badge>}</div>
                  </div>
                </div>

                <Button type="button" variant="ghost" size="icon" onClick={() => removeField(idx)} disabled={disabled} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
