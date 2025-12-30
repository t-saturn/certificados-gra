import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const AuditStatsGrid: React.FC = () => {
  const totalEventos = 8;
  const exitosos = 6;
  const errores = 1;

  return (
    <section className="gap-4 grid md:grid-cols-3">
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="font-medium text-muted-foreground text-sm">Total de Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-semibold text-3xl">{totalEventos}</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="font-medium text-muted-foreground text-sm">Operaciones Exitosas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-3xl">{exitosos}</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="font-medium text-muted-foreground text-sm">Errores</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-semibold text-red-600 dark:text-red-400 text-3xl">{errores}</p>
        </CardContent>
      </Card>
    </section>
  );
};
