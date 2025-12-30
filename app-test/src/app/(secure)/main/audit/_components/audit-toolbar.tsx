'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const AuditToolbar: React.FC = () => {
  return (
    <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3">
      {/* Buscador */}
      <div className="relative w-full sm:max-w-xl">
        <span className="top-1/2 left-3 absolute -translate-y-1/2 pointer-events-none">
          <Search className="w-4 h-4 text-muted-foreground" />
        </span>
        <Input placeholder="Buscar por usuario, acción o recurso..." className="bg-background pl-9 border-muted rounded-sm" />
      </div>

      {/* Filtro por tipo */}
      <div className="w-full sm:w-40">
        <Select defaultValue="all">
          <SelectTrigger className="bg-background border-muted rounded-full w-full text-sm">
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="success">Éxito</SelectItem>
            <SelectItem value="warning">Advertencias</SelectItem>
            <SelectItem value="error">Errores</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
