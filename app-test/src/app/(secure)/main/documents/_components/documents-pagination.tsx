'use client';

import { Button } from '@/components/ui/button';

type Props = {
  page: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export default function DocumentsPagination({ page, totalPages, hasPrev, hasNext, loading, onPrev, onNext }: Props) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </span>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={!hasPrev || loading} onClick={onPrev}>
          Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={!hasNext || loading} onClick={onNext}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
