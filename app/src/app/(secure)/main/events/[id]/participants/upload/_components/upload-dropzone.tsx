import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface Props {
  dragActive: boolean;
  loading: boolean;
  acceptedExtensions: string[];
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadDropzone: React.FC<Props> = ({ dragActive, loading, acceptedExtensions, onDrag, onDrop, onFileInput }) => {
  const acceptAttr = acceptedExtensions.join(',');

  return (
    <Card
      className={`p-12 border-2 border-dashed cursor-pointer transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
      onDragEnter={onDrag}
      onDragLeave={onDrag}
      onDragOver={onDrag}
      onDrop={onDrop}
    >
      <div className="flex flex-col items-center text-center">
        <Upload className="mb-4 w-12 h-12 text-primary" />
        <h3 className="mb-2 font-semibold text-foreground text-lg">Arrastra tu archivo aquí</h3>
        <p className="mb-4 text-muted-foreground">o haz clic para seleccionar</p>

        <input id="participants-input" type="file" accept={acceptAttr} onChange={onFileInput} className="hidden" />

        <Button onClick={() => document.getElementById('participants-input')?.click()} variant="outline" disabled={loading}>
          {loading ? 'Procesando...' : 'Seleccionar Archivo'}
        </Button>

        <p className="mt-4 text-muted-foreground text-xs">Formatos soportados: JSON, YAML, Excel</p>
      </div>
    </Card>
  );
};
