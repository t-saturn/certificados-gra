import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock3, User2 } from 'lucide-react';

type AuditResult = 'success' | 'error' | 'warning';

interface AuditEvent {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  result: AuditResult;
  resultLabel: string;
  note?: string;
}

const auditEvents: AuditEvent[] = [
  {
    id: 1,
    timestamp: '2024-03-15 14:30:00',
    user: 'Juan García',
    action: 'Emitió lote de certificados',
    resource: 'Capacitación Q2',
    result: 'success',
    resultLabel: 'Éxito',
  },
  {
    id: 2,
    timestamp: '2024-03-15 13:45:00',
    user: 'María López',
    action: 'Firmó 45 certificados',
    resource: 'Taller Seguridad',
    result: 'success',
    resultLabel: 'Éxito',
  },
  {
    id: 3,
    timestamp: '2024-03-15 12:20:00',
    user: 'Admin Sistema',
    action: 'Creó nuevo evento',
    resource: 'Workshop Avanzado',
    result: 'success',
    resultLabel: 'Éxito',
  },
  {
    id: 4,
    timestamp: '2024-03-15 11:15:00',
    user: 'Roberto Pérez',
    action: 'Intento de acceso no autorizado',
    resource: 'Panel Superadmin',
    result: 'error',
    resultLabel: 'Error',
  },
  {
    id: 5,
    timestamp: '2024-03-15 10:05:00',
    user: 'Carlos Mendoza',
    action: 'Cargó lista de participantes',
    resource: 'Seminario Compliance',
    result: 'success',
    resultLabel: 'Éxito',
  },
  {
    id: 6,
    timestamp: '2024-03-15 09:30:00',
    user: 'Ana Martínez',
    action: 'Descargó reporte de certificados',
    resource: 'Reportes',
    result: 'success',
    resultLabel: 'Éxito',
  },
  {
    id: 7,
    timestamp: '2024-03-15 02:00:00',
    user: 'Sistema',
    action: 'Respaldo automático ejecutado',
    resource: 'Base de Datos',
    result: 'warning',
    resultLabel: 'Advertencia',
    note: 'Tardó más de lo esperado',
  },
  {
    id: 8,
    timestamp: '2024-03-14 16:45:00',
    user: 'Juan García',
    action: 'Anuló certificado',
    resource: 'CERT-2024-001',
    result: 'success',
    resultLabel: 'Éxito',
  },
];

// SOLO variants válidos de shadcn
const getBadgeVariant = (result: AuditResult): 'default' | 'destructive' | 'outline' => {
  switch (result) {
    case 'success':
      return 'default';
    case 'error':
      return 'destructive';
    case 'warning':
      return 'outline';
  }
};

const getBadgeClasses = (result: AuditResult) => {
  switch (result) {
    case 'success':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
    case 'warning':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
    case 'error':
      return ''; // destructive ya lo pinta
  }
};

export const AuditTable: React.FC = () => {
  return (
    <div className="bg-card border rounded-2xl overflow-hidden text-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[220px]">Timestamp</TableHead>
            <TableHead className="w-[220px]">Usuario</TableHead>
            <TableHead>Acción</TableHead>
            <TableHead className="w-[220px]">Recurso</TableHead>
            <TableHead className="w-[120px] text-center">Resultado</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {auditEvents.map((event) => (
            <TableRow key={event.id} className="hover:bg-muted/40">
              <TableCell>
                <div className="flex items-center gap-2 text-xs">
                  <Clock3 className="w-4 h-4 text-muted-foreground" />
                  <span>{event.timestamp}</span>
                </div>
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex justify-center items-center bg-muted rounded-full w-7 h-7">
                    <User2 className="w-4 h-4 text-muted-foreground" />
                  </span>
                  <span>{event.user}</span>
                </div>
              </TableCell>

              <TableCell>
                <div className="flex flex-col text-xs">
                  <span>{event.action}</span>
                  {event.note && <span className="text-muted-foreground text-xs">{event.note}</span>}
                </div>
              </TableCell>

              <TableCell className="text-muted-foreground text-xs">{event.resource}</TableCell>

              <TableCell className="text-center">
                <Badge variant={getBadgeVariant(event.result)} className={getBadgeClasses(event.result)}>
                  {event.resultLabel}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
