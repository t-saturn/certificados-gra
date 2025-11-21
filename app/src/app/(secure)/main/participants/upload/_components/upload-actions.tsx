import React from 'react';
import { Button } from '@/components/ui/button';

export const UploadActions: React.FC<{
  onReset: () => void;
  onConfirm: () => void;
}> = ({ onReset, onConfirm }) => {
  return (
    <div className="flex justify-end gap-4">
      <Button variant="outline" onClick={onReset}>
        Volver a Cargar
      </Button>
      <Button onClick={onConfirm}>Confirmar Carga</Button>
    </div>
  );
};
