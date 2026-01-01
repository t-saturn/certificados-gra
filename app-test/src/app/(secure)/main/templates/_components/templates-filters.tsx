import type { FC, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export interface TemplatesFiltersProps {
  search: string;
  isPending: boolean;
  onSearchChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTypeChange: (value: string) => void;
}

export const TemplatesFilters: FC<TemplatesFiltersProps> = ({ search, isPending, onSearchChange, onSubmit, onTypeChange }) => {
  return (
    <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-3">
      <form onSubmit={onSubmit} className="flex flex-1 gap-2">
        <Input placeholder="Buscar por nombre o descripción..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="max-w-md" />
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Buscar
        </Button>
      </form>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">Tipo:</span>
        <Select defaultValue="all" onValueChange={onTypeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="certificate">Certificados</SelectItem>
            <SelectItem value="constancy">Constancias</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
