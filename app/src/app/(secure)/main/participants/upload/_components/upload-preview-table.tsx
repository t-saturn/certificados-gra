import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import type { ParticipantRecord } from '../page';

export const UploadPreviewTable: React.FC<{
  fileName?: string;
  data: ParticipantRecord[];
}> = ({ fileName, data }) => {
  return (
    <>
      <Card className="bg-emerald-50 dark:bg-emerald-900/20 p-6 border-border">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">Archivo procesado correctamente</p>
            <p className="text-emerald-700 dark:text-emerald-300 text-sm">
              {data.length} registros encontrados {fileName ? `(${fileName})` : ''}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-border overflow-x-auto">
        <h3 className="mb-4 font-semibold text-foreground text-lg">Validación de Registros</h3>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Nombre</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">DNI</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Email</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Área</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-left">Estado</th>
            </tr>
          </thead>

          <tbody>
            {data.map((record, idx) => (
              <tr key={idx} className="hover:bg-muted/50 border-border border-b">
                <td className="px-4 py-3 text-foreground">{record.name}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{record.dni}</td>
                <td className="px-4 py-3 text-muted-foreground">{record.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{record.area}</td>
                <td className="px-4 py-3">
                  <span className="bg-emerald-100 dark:bg-emerald-900/40 px-3 py-1 rounded-full font-medium text-emerald-700 dark:text-emerald-200 text-xs">✓ Válido</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
};
