/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { UploadPageHeader } from './_components/upload-page-header';
import { UploadDropzone } from './_components/upload-dropzone';
import { UploadFormatHelp } from './_components/upload-format-help';
import { UploadPreviewTable } from './_components/upload-preview-table';
import { UploadActions } from './_components/upload-actions';

import * as XLSX from 'xlsx';
import YAML from 'js-yaml';

export type ParticipantRecord = {
  name: string;
  dni: string;
  email: string;
  area: string;
};

type ParseResult = { ok: true; data: ParticipantRecord[] } | { ok: false; error: string };

export default function UploadParticipantsPage() {
  const router = useRouter();

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedData, setUploadedData] = useState<ParticipantRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptedExtensions = useMemo(() => ['.json', '.yml', '.yaml', '.xlsx', '.xls'], []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const validateRecord = (r: any, idx: number): ParticipantRecord | null => {
    const name = String(r?.name ?? r?.nombre ?? '').trim();
    const dni = String(r?.dni ?? '').trim();
    const email = String(r?.email ?? '').trim();
    const area = String(r?.area ?? '').trim();

    if (!name || !dni || !email || !area) {
      // si quieres, acá podrías devolver info más detallada por fila
      return null;
    }
    return { name, dni, email, area };
  };

  const parseJson = async (f: File): Promise<ParseResult> => {
    try {
      const text = await f.text();
      const raw = JSON.parse(text);

      const rows = Array.isArray(raw) ? raw : raw?.participants ?? raw?.data;
      if (!Array.isArray(rows)) return { ok: false, error: 'El JSON debe ser un array de participantes.' };

      const parsed: ParticipantRecord[] = [];
      for (let i = 0; i < rows.length; i++) {
        const rec = validateRecord(rows[i], i);
        if (rec) parsed.push(rec);
      }

      if (!parsed.length) return { ok: false, error: 'No se encontraron registros válidos.' };

      return { ok: true, data: parsed };
    } catch {
      return { ok: false, error: 'JSON inválido o mal formado.' };
    }
  };

  const parseYaml = async (f: File): Promise<ParseResult> => {
    try {
      const text = await f.text();
      const raw = YAML.load(text) as any;

      const rows = Array.isArray(raw) ? raw : raw?.participants ?? raw?.data;
      if (!Array.isArray(rows)) return { ok: false, error: 'El YAML debe ser un array de participantes.' };

      const parsed: ParticipantRecord[] = [];
      for (let i = 0; i < rows.length; i++) {
        const rec = validateRecord(rows[i], i);
        if (rec) parsed.push(rec);
      }

      if (!parsed.length) return { ok: false, error: 'No se encontraron registros válidos.' };

      return { ok: true, data: parsed };
    } catch {
      return { ok: false, error: 'YAML inválido o mal formado.' };
    }
  };

  const parseExcel = async (f: File): Promise<ParseResult> => {
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws);

      if (!rows.length) return { ok: false, error: 'El Excel está vacío o no tiene filas.' };

      const parsed: ParticipantRecord[] = [];
      for (let i = 0; i < rows.length; i++) {
        const rec = validateRecord(rows[i], i);
        if (rec) parsed.push(rec);
      }

      if (!parsed.length) return { ok: false, error: 'No se encontraron registros válidos.' };

      return { ok: true, data: parsed };
    } catch {
      return { ok: false, error: 'No se pudo leer el Excel. Revisa el formato.' };
    }
  };

  const processFile = useCallback(async (f: File) => {
    setFile(f);
    setLoading(true);
    setError(null);

    const ext = f.name.toLowerCase();

    let result: ParseResult;
    if (ext.endsWith('.json')) result = await parseJson(f);
    else if (ext.endsWith('.yml') || ext.endsWith('.yaml')) result = await parseYaml(f);
    else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) result = await parseExcel(f);
    else
      result = {
        ok: false,
        error: 'Formato no soportado. Usa JSON, YAML o Excel.',
      };

    if (result.ok) setUploadedData(result.data);
    else setError(result.error);

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleConfirm = () => {
    console.log('Participantes cargados:', uploadedData);
    router.push('/dashboard/admin/participants');
  };

  const handleReset = () => {
    setFile(null);
    setUploadedData(null);
    setError(null);
  };

  return (
    <div className="space-y-6 p-6">
      <UploadPageHeader onBack={() => router.back()} />

      {!uploadedData ? (
        <div className="space-y-6">
          <UploadDropzone dragActive={dragActive} loading={loading} acceptedExtensions={acceptedExtensions} onDrag={handleDrag} onDrop={handleDrop} onFileInput={handleFileInput} />

          {error && <div className="bg-destructive/5 px-4 py-3 border border-destructive/30 rounded-xl text-destructive text-sm">{error}</div>}

          <UploadFormatHelp />
        </div>
      ) : (
        <div className="space-y-6">
          <UploadPreviewTable fileName={file?.name} data={uploadedData} />
          <UploadActions onReset={handleReset} onConfirm={handleConfirm} />
        </div>
      )}
    </div>
  );
}
