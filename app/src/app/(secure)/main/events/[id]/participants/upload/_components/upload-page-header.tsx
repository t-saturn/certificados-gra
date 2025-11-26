import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const UploadPageHeader: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="flex items-center gap-4">
      <button onClick={onBack} className="hover:bg-muted p-2 rounded-lg transition-colors" aria-label="Volver">
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>

      <div>
        <h1 className="font-bold text-foreground text-3xl">Cargar Participantes</h1>
        <p className="text-muted-foreground">Importa un archivo JSON, YAML o Excel con los datos de los participantes</p>
      </div>
    </div>
  );
};
