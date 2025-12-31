'use client';

import type { FC, FormEvent } from 'react';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export type EventsFilterFormValues = {
  search_query: string;
  status: string; // 'ALL' | 'SCHEDULED' | etc
  is_public: 'all' | 'true' | 'false';
  date_from: string;
  date_to: string;
};

export interface EventsFiltersProps {
  initialSearchQuery: string;
  initialStatus: string;
  initialIsPublic: 'all' | 'true' | 'false';
  initialDateFrom: string;
  initialDateTo: string;
  onApplyFilters: (values: EventsFilterFormValues) => void;
}

export const EventsFilters: FC<EventsFiltersProps> = ({ initialSearchQuery, initialStatus, initialIsPublic, initialDateFrom, initialDateTo, onApplyFilters }) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [status, setStatus] = useState(initialStatus || 'ALL');
  const [isPublic, setIsPublic] = useState<'all' | 'true' | 'false'>(initialIsPublic || 'all');
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    onApplyFilters({
      search_query: searchQuery.trim(),
      status,
      is_public: isPublic,
      date_from: dateFrom,
      date_to: dateTo,
    });
  };

  const handleReset = (): void => {
    setSearchQuery('');
    setStatus('ALL');
    setIsPublic('all');
    setDateFrom('');
    setDateTo('');
    onApplyFilters({ search_query: '', status: 'ALL', is_public: 'all', date_from: '', date_to: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="grid w-full items-end gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[3fr_1fr_1fr_auto_auto]">
      <div className="flex flex-col gap-1">
        <Label>Buscar</Label>
        <Input placeholder="Título, código..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <Label>Desde</Label>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <Label>Hasta</Label>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <Label>Estado</Label>
        <Select value={status} onValueChange={(value) => setStatus(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="SCHEDULED">Programado</SelectItem>
            <SelectItem value="DRAFT">Borrador</SelectItem>
            <SelectItem value="FINISHED">Finalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Aplicar
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleReset}>
          Limpiar
        </Button>
      </div>
    </form>
  );
};
