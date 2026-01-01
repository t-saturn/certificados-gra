import type { FC } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TemplatesHeaderProps {}

export const TemplatesHeader: FC<TemplatesHeaderProps> = () => {
  return (
    <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4">
      <div>
        <h1 className="font-bold text-foreground text-xl">Gestión de Plantillas</h1>
        <p className="text-muted-foreground text-sm">Crea y administra plantillas de certificados y constancias</p>
      </div>
      <Link href="/main/templates/new">
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Plantilla
        </Button>
      </Link>
    </div>
  );
};
