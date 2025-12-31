import type { FC } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';

import type { ScheduleForm } from './new-event-types';

export interface NewEventStep1Props {
  isPublic: boolean;
  code: string;
  certificateSeries: string;
  organizationalUnitsPath: string;
  title: string;
  description: string;
  location: string;
  maxParticipants: number | '';
  registrationOpenAt: string;
  registrationCloseAt: string;
  schedules: ScheduleForm[];
  onChangeIsPublic: (value: boolean) => void;
  onChangeCode: (value: string) => void;
  onChangeCertificateSeries: (value: string) => void;
  onChangeOrgUnitsPath: (value: string) => void;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeLocation: (value: string) => void;
  onChangeMaxParticipants: (value: number | '') => void;
  onChangeRegistrationOpenAt: (value: string) => void;
  onChangeRegistrationCloseAt: (value: string) => void;
  onAddSchedule: () => void;
  onRemoveSchedule: (index: number) => void;
  onUpdateSchedule: (index: number, field: keyof ScheduleForm, value: string) => void;
}

export const NewEventStep1: FC<NewEventStep1Props> = ({
  isPublic,
  code,
  certificateSeries,
  organizationalUnitsPath,
  title,
  description,
  location,
  maxParticipants,
  registrationOpenAt,
  registrationCloseAt,
  schedules,
  onChangeIsPublic,
  onChangeCode,
  onChangeCertificateSeries,
  onChangeOrgUnitsPath,
  onChangeTitle,
  onChangeDescription,
  onChangeLocation,
  onChangeMaxParticipants,
  onChangeRegistrationOpenAt,
  onChangeRegistrationCloseAt,
  onAddSchedule,
  onRemoveSchedule,
  onUpdateSchedule,
}) => {
  return (
    <>
      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Información del Evento</h2>

        <div className="gap-4 grid md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label>Oficina / Dependencia / Unidad Orgánica *</Label>
            <Input value={code} onChange={(e) => onChangeCode(e.target.value)} placeholder="Ej: OTIC" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Serie de Certificado *</Label>
            <Input value={certificateSeries} onChange={(e) => onChangeCertificateSeries(e.target.value)} placeholder="Ej: CERT" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Es público</Label>
            <div className="flex items-center gap-2 mt-1">
              <Switch checked={isPublic} onCheckedChange={(val) => onChangeIsPublic(val)} />
              <span className="text-xs text-muted-foreground">Visible para público general</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Ruta de Unidades Organizacionales *</Label>
          <Input value={organizationalUnitsPath} onChange={(e) => onChangeOrgUnitsPath(e.target.value)} placeholder="Ej: GGR|OTIC" />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Título *</Label>
          <Input value={title} onChange={(e) => onChangeTitle(e.target.value)} placeholder="Ej: Curso de Transformación Digital" />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Descripción *</Label>
          <Textarea rows={3} value={description} onChange={(e) => onChangeDescription(e.target.value)} placeholder="Describe los objetivos del evento..." />
        </div>

        <div className="gap-4 grid md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Ubicación *</Label>
            <Input value={location} onChange={(e) => onChangeLocation(e.target.value)} placeholder="Ej: Auditorio Principal" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Máx. participantes</Label>
            <Input type="number" min={1} value={maxParticipants} onChange={(e) => onChangeMaxParticipants(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ej: 100" />
          </div>
        </div>

        <div className="gap-4 grid md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Apertura de inscripción *</Label>
            <Input type="datetime-local" value={registrationOpenAt} onChange={(e) => onChangeRegistrationOpenAt(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Cierre de inscripción *</Label>
            <Input type="datetime-local" value={registrationCloseAt} onChange={(e) => onChangeRegistrationCloseAt(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-border">
        <h2 className="font-semibold text-lg">Fechas del Evento *</h2>

        {schedules.map((sch, idx) => (
          <div key={idx} className="items-end gap-4 grid md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Inicio *</Label>
              <Input type="datetime-local" value={sch.start_datetime} onChange={(e) => onUpdateSchedule(idx, 'start_datetime', e.target.value)} />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Fin *</Label>
              <Input type="datetime-local" value={sch.end_datetime} onChange={(e) => onUpdateSchedule(idx, 'end_datetime', e.target.value)} />
            </div>

            <Button type="button" variant="ghost" className="flex items-center gap-2 col-span-2 w-fit text-destructive" onClick={() => onRemoveSchedule(idx)} disabled={schedules.length <= 1}>
              <Trash2 className="w-4 h-4" />
              Eliminar fecha
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={onAddSchedule} className="gap-2">
          <Plus className="w-4 h-4" />
          Agregar fecha
        </Button>
      </div>
    </>
  );
};
