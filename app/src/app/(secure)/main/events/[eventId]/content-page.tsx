'use client';

import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { Separator } from '@/components/ui/separator';

import { FileText, Trash2, Edit2, Download, Clock, CheckCircle2, XCircle } from 'lucide-react';

import type { EventDetailResult, EventDetailParticipant } from '@/actions/fn-event-detail';

// Estados posibles de certificado a nivel UI
type CertificateStatus = 'sin_certificado' | 'pendiente_de_firma' | 'anulado' | 'disponible_para_descargar';

interface EventDetailClientProps {
  event: EventDetailResult;
}

export const EventDetailClient: FC<EventDetailClientProps> = ({ event }) => {
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<EventDetailParticipant | null>(null);

  // Por ahora, como el backend todavía no devuelve estado de certificado por participante,
  // asumimos "sin_certificado" para todos. Luego aquí puedes mapear desde los datos reales.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getCertificateStatusForParticipant = (_p: EventDetailParticipant): CertificateStatus => {
    return 'sin_certificado';
  };

  // Calcular fechas útiles para el flujo
  const { startDate, createdAt } = useMemo(() => {
    const firstSchedule = event.schedules[0];

    return {
      startDate: firstSchedule ? new Date(firstSchedule.start_datetime) : null,
      createdAt: new Date(event.created_at),
    };
  }, [event]);

  const formattedCreatedAt = useMemo(() => (createdAt ? format(createdAt, 'dd/MM/yyyy HH:mm') : '-'), [createdAt]);

  const formattedStartDate = useMemo(() => (startDate ? format(startDate, 'dd/MM/yyyy HH:mm') : '-'), [startDate]);

  const handleOpenCertModal = (participant: EventDetailParticipant) => {
    setSelectedParticipant(participant);
    setCertModalOpen(true);
  };

  const statusColor = (status: string): string => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'FINISHED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  const certificateStatusLabel = (status: CertificateStatus): string => {
    switch (status) {
      case 'sin_certificado':
        return 'Sin certificado';
      case 'pendiente_de_firma':
        return 'Pendiente de firma';
      case 'anulado':
        return 'Anulado';
      case 'disponible_para_descargar':
        return 'Disponible para descargar';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Detalle principal del evento */}
      <Card className="space-y-4 p-6">
        <div className="flex md:flex-row flex-col md:justify-between md:items-start gap-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-xl">{event.title}</h2>
            <p className="text-muted-foreground text-sm">{event.description}</p>

            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <Badge variant="outline" className="font-normal">
                Tipo: {event.document_type.name}
              </Badge>
              <Badge variant="outline" className="font-normal">
                Ubicación: {event.location}
              </Badge>
              <Badge variant="outline" className={`font-normal border ${statusColor(event.status)}`}>
                Estado: {event.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-1 text-muted-foreground text-xs">
            <p>
              Creado el: <span className="font-medium text-foreground">{formattedCreatedAt}</span>
            </p>
            <p>
              Inicio programado: <span className="font-medium text-foreground">{formattedStartDate}</span>
            </p>
            <p>
              Creador: <span className="font-mono text-[11px]">{event.created_by}</span>
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        <ul className="space-y-1 text-xs">
          {event.schedules.map((s, idx) => {
            const start = new Date(s.start_datetime);
            const end = new Date(s.end_datetime);

            const timeRange = `${format(start, 'hh:mm a', { locale: es })} a ${format(end, 'hh:mm a', { locale: es })}`;
            const fullDate = format(start, "d 'de' MMMM 'de' yyyy", { locale: es });

            return (
              <li key={idx} className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span>
                  {timeRange} - {fullDate}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Participantes */}
      <Card className="space-y-4 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg">Participantes</h3>
            <p className="text-muted-foreground text-xs">Listado de personas registradas al evento.</p>
          </div>

          {/* Acciones globales (por ahora solo UI) */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              Importar participantes
            </Button>
            <Button variant="outline" size="sm">
              Generar certificados
            </Button>
            <Button variant="outline" size="sm">
              Enviar a firma
            </Button>
          </div>
        </div>

        {event.participants.length === 0 ? (
          <div className="p-4 border border-border border-dashed rounded-md text-muted-foreground text-xs text-center">No hay participantes registrados todavía.</div>
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">DNI</TableHead>
                  <TableHead>Nombre completo</TableHead>
                  <TableHead className="hidden md:table-cell">Correo</TableHead>
                  <TableHead className="hidden md:table-cell">Registro</TableHead>
                  <TableHead className="hidden md:table-cell">Asistencia</TableHead>
                  <TableHead className="w-40 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {event.participants.map((p) => {
                  const certStatus = getCertificateStatusForParticipant(p);

                  return (
                    <TableRow key={p.user_detail_id}>
                      <TableCell className="font-mono text-xs">{p.national_id}</TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{p.full_name}</div>
                        <div className="md:hidden text-[11px] text-muted-foreground">{p.email}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{p.email ?? '-'}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{p.registration_status}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{p.attendance_status}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="w-8 h-8" title="Editar participante">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" title="Eliminar participante">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8" title="Estado de certificado" onClick={() => handleOpenCertModal(p)}>
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">Certificado: {certificateStatusLabel(certStatus)}</div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Sección para agregar participantes manualmente (solo UI) */}
      <Card className="space-y-2 p-4">
        <h3 className="font-semibold text-sm">Agregar participantes</h3>
        <p className="mb-2 text-muted-foreground text-xs">Aquí luego podrás cargar participantes manualmente o desde un archivo.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline">
            Agregar participante
          </Button>
          <Button size="sm" variant="outline">
            Cargar desde archivo
          </Button>
        </div>
      </Card>

      {/* Modal de estado de certificado */}
      <Dialog open={certModalOpen} onOpenChange={setCertModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Estado del certificado</DialogTitle>
            <DialogDescription>Flujo del certificado para el participante seleccionado.</DialogDescription>
          </DialogHeader>

          {selectedParticipant ? (
            <div className="space-y-4">
              <div className="space-y-1 text-sm">
                <p className="font-medium">{selectedParticipant.full_name}</p>
                <p className="text-muted-foreground text-xs">
                  DNI: <span className="font-mono">{selectedParticipant.national_id}</span>
                </p>
                <p className="text-muted-foreground text-xs">Email: {selectedParticipant.email ?? '-'}</p>
              </div>

              <Separator />

              {/* Timeline conceptual del flujo */}
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2">
                  <Clock className="mt-[2px] w-4 h-4" />
                  <div>
                    <p className="font-semibold">Sin certificado</p>
                    <p className="text-muted-foreground">Estado inicial. El participante está registrado pero aún no se ha generado el certificado.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <FileText className="mt-[2px] w-4 h-4" />
                  <div>
                    <p className="font-semibold">Pendiente de firma</p>
                    <p className="text-muted-foreground">Una vez generados los certificados, pasan a esta etapa mientras se recopilan las firmas digitales correspondientes.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-[2px] w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="font-semibold">Disponible para descargar</p>
                    <p className="text-muted-foreground">
                      Cuando todas las firmas estén completas, el certificado estará listo para ser descargado por el administrador o el propio participante.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <XCircle className="mt-[2px] w-4 h-4 text-red-500" />
                  <div>
                    <p className="font-semibold">Anulado</p>
                    <p className="text-muted-foreground">
                      En caso de error o invalidez del proceso, el certificado puede marcarse como anulado y ya no estará disponible para descarga.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <div className="text-[11px] text-muted-foreground">
                  Este flujo es informativo. Más adelante aquí podrás ver las fechas reales en las que el certificado cambia de estado.
                </div>
                <Button size="sm" variant="outline">
                  <Download className="mr-1 w-3 h-3" />
                  Descargar (cuando esté disponible)
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">Selecciona un participante para ver el estado de su certificado.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventDetailClient;
