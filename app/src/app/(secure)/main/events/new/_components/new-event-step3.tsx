'use client';

import type { FC, DragEvent, JSX } from 'react';
import { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

import type { ParticipantForm } from './new-event-types';

export interface NewEventStep3Props {
  participants: ParticipantForm[];
  hasParticipants: boolean;
  fileName: string | null;
  fileError: string | null;
  isParsingFile: boolean;
  // eslint-disable-next-line no-unused-vars
  onSelectFile: (file: File) => void;
}

type ExampleTab = 'excel' | 'json' | 'yaml' | 'csv';

export const NewEventStep3: FC<NewEventStep3Props> = ({ participants, hasParticipants, fileName, fileError, isParsingFile, onSelectFile }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<ExampleTab>('excel');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    onSelectFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    onSelectFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleClickDropzone = (): void => {
    inputRef.current?.click();
  };

  const renderExample = (): JSX.Element => {
    switch (activeTab) {
      case 'excel':
        return (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>Hoja de cálculo con una fila de encabezados y filas de datos. El nombre de las columnas debe coincidir con estos campos:</p>
            <div className="overflow-auto rounded border border-border bg-background">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">national_id</th>
                    <th className="px-3 py-2 text-left font-semibold">first_name</th>
                    <th className="px-3 py-2 text-left font-semibold">last_name</th>
                    <th className="px-3 py-2 text-left font-semibold">phone</th>
                    <th className="px-3 py-2 text-left font-semibold">email</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-3 py-1">12345678</td>
                    <td className="px-3 py-1">Juan</td>
                    <td className="px-3 py-1">Pérez</td>
                    <td className="px-3 py-1">999999999</td>
                    <td className="px-3 py-1">juan@example.com</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'json':
        return (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>Puede ser un arreglo de participantes:</p>
            <pre className="overflow-auto rounded border border-border bg-background p-3 text-[11px] font-mono">
              {`[
  {
    "national_id": "12345678",
    "first_name": "Juan",
    "last_name": "Pérez",
    "phone": "999999999",
    "email": "juan@example.com"
  }
]`}
            </pre>
            <p>
              O un objeto con la clave <span className="font-mono">participants</span>:
            </p>
            <pre className="overflow-auto rounded border border-border bg-background p-3 text-[11px] font-mono">
              {`{
  "participants": [
    {
      "national_id": "12345678",
      "first_name": "Juan",
      "last_name": "Pérez",
      "phone": "999999999",
      "email": "juan@example.com"
    }
  ]
}`}
            </pre>
          </div>
        );
      case 'yaml':
        return (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              Archivo YAML con una lista llamada <span className="font-mono">participants</span>:
            </p>
            <pre className="overflow-auto rounded border border-border bg-background p-3 text-[11px] font-mono">
              {`participants:
  - national_id: "12345678"
    first_name: "Juan"
    last_name: "Pérez"
    phone: "999999999"
    email: "juan@example.com"
  - national_id: "87654321"
    first_name: "María"
    last_name: "García"
    phone: "988888888"
    email: "maria@example.com"`}
            </pre>
          </div>
        );
      case 'csv':
        return (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>Archivo de texto plano separado por comas:</p>
            <pre className="overflow-auto rounded border border-border bg-background p-3 text-[11px] font-mono">
              {`national_id,first_name,last_name,phone,email
12345678,Juan,Pérez,999999999,juan@example.com
87654321,María,García,988888888,maria@example.com`}
            </pre>
          </div>
        );
      default:
        return <></>;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">Participantes (opcional)</h2>
      <p className="text-xs text-muted-foreground">
        Puedes cargar un archivo de <strong>hoja de cálculo (.xlsx/.xls)</strong>, <strong>CSV</strong>, <strong>JSON</strong> o <strong>YAML</strong> con la lista de participantes. Si no cargas ningún archivo,
        el evento se guardará sin participantes.
      </p>

      {/* Área Drag & Drop + input */}
      <div className="space-y-3">
        <Label className="text-xs">Archivo de participantes</Label>

        <div
          onClick={handleClickDropzone}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex flex-col items-center justify-center rounded-md border border-dashed p-6 text-xs cursor-pointer transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/40 hover:bg-muted'}`}
        >
          <p className="mb-1 font-medium">Arrastra y suelta el archivo aquí</p>
          <p className="text-muted-foreground">o haz clic para buscar en tu equipo</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Formatos soportados: <span className="font-mono">.xlsx, .xls, .csv, .json, .yml, .yaml</span>
          </p>
        </div>

        {/* input real, oculto */}
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.json,.yml,.yaml" onChange={handleInputChange} className="hidden" />

        {fileName && (
          <p className="text-xs text-muted-foreground">
            Archivo seleccionado: <span className="font-medium">{fileName}</span>
          </p>
        )}

        {isParsingFile && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Procesando archivo...</span>
          </div>
        )}

        {fileError && <p className="text-xs text-destructive">{fileError}</p>}
      </div>

      {/* Tabs de ejemplos */}
      <div className="space-y-2">
        <div className="inline-flex rounded-md border bg-muted/40 p-1 text-xs">
          {[
            { id: 'excel', label: 'Hoja de cálculo' },
            { id: 'json', label: 'JSON' },
            { id: 'yaml', label: 'YAML' },
            { id: 'csv', label: 'CSV' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ExampleTab)}
              className={`px-3 py-1 rounded-md transition-colors ${activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {renderExample()}
      </div>

      {/* Participantes detectados */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Participantes detectados {hasParticipants && `(${participants.length})`}</h3>

        {!hasParticipants ? (
          <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">No hay participantes cargados todavía.</div>
        ) : (
          <div className="rounded-md border border-border max-h-72 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">DNI</th>
                  <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                  <th className="px-3 py-2 text-left font-semibold">Apellido</th>
                  <th className="px-3 py-2 text-left font-semibold">Teléfono</th>
                  <th className="px-3 py-2 text-left font-semibold">Email</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-1 font-mono">{p.national_id}</td>
                    <td className="px-3 py-1">{p.first_name}</td>
                    <td className="px-3 py-1">{p.last_name}</td>
                    <td className="px-3 py-1">{p.phone}</td>
                    <td className="px-3 py-1">{p.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
