import type { FC } from 'react';
import { ArrowLeft } from 'lucide-react';

export interface NewEventHeaderProps {
  onBack: () => void;
}

export const NewEventHeader: FC<NewEventHeaderProps> = ({ onBack }) => {
  return (
    <div className="flex items-center gap-4 mb-2">
      <button type="button" onClick={onBack} className="hover:bg-muted p-2 rounded-lg transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div>
        <h1 className="font-bold text-3xl">Registrar Nuevo Evento</h1>
        <p className="text-muted-foreground">Completa los pasos para crear un nuevo evento.</p>
      </div>
    </div>
  );
};
