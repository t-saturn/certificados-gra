import React from 'react';

export const AuditPageHeader: React.FC = () => {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="font-semibold text-foreground text-xl tracking-tight">Bitácora de Auditoría</h1>
      <p className="text-muted-foreground text-xs">Registro de todas las acciones en el sistema.</p>
    </header>
  );
};
