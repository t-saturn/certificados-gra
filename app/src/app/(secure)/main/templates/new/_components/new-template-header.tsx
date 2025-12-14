import type { FC } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';

export interface NewTemplateHeaderProps {
  onBack: () => void;
  isLoadingCatalogs: boolean;
}

export const NewTemplateHeader: FC<NewTemplateHeaderProps> = ({ onBack, isLoadingCatalogs }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onBack} className="hover:bg-muted p-2 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        <div>
          <h1 className="font-bold text-foreground text-3xl">Crear Plantilla</h1>
          <p className="text-muted-foreground">Diseña una nueva plantilla de certificado, constancia o reconocimiento</p>

          {isLoadingCatalogs && (
            <p className="flex items-center gap-2 text-muted-foreground text-xs mt-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Cargando catálogos...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
