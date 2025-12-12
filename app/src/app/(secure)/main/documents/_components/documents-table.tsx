'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, KeyRound, Copy, Package } from 'lucide-react';

import { fn_list_certificates, type CertificateListItem, type CertificateListResponse, type CertificateStatus } from '@/actions/fn-certificates';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import DocumentsPagination from './documents-pagination';
type Props = {
  initialData: CertificateListResponse;
};

function formatEventDate(item: CertificateListItem): string {
  const d = new Date(item.issue_date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}

export default function DocumentsTable({ initialData }: Props) {
  const router = useRouter();
  const [data, setData] = useState<CertificateListResponse>(initialData);
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<CertificateStatus>('all');
  const [page, setPage] = useState<number>(initialData.pagination.page ?? 1);
  const [loading, setLoading] = useState<boolean>(false);

  const totalPages = useMemo(() => data.pagination.total_pages ?? 1, [data.pagination.total_pages]);

  const load = async (nextPage: number) => {
    setLoading(true);
    try {
      const res = await fn_list_certificates({
        search_query: search?.trim() ? search.trim() : undefined,
        status,
        page: nextPage,
        page_size: 10,
      });
      setData(res);
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const renderStatus = (item: CertificateListItem) => {
    if (item.status === 'GENERATED') return <Badge className="bg-green-600">Listo</Badge>;
    if (item.status === 'REJECTED') return <Badge variant="destructive">Rechazado</Badge>;
    return <Badge variant="secondary">Pendiente</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o DNI" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void load(1)} />
        </div>

        <Select value={status} onValueChange={(v) => setStatus(v as CertificateStatus)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="CREATED">Pendiente</SelectItem>
            <SelectItem value="GENERATED">Listo</SelectItem>
            <SelectItem value="REJECTED">Rechazado</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => void load(1)} disabled={loading}>
          Buscar
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left">Participante</th>
              <th className="px-4 py-3 text-left">Evento</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Archivo</th>
              <th className="px-4 py-3 text-left">Estado</th>
            </tr>
          </thead>

          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No se encontraron documentos.
                </td>
              </tr>
            ) : (
              data.items.map((item) => (
                <tr key={item.id} className="border-t cursor-pointer hover:bg-muted/40" onClick={() => router.push(`/documents/${item.id}`)}>
                  {/* Participante */}
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">
                      {item.participant.national_id} - {item.participant.full_name}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <KeyRound className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[260px]">{item.serial_code}</span>

                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          void copyToClipboard(item.serial_code);
                        }}
                        title="Copiar código del documento"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span className="sr-only">Copiar</span>
                      </button>
                    </div>
                  </td>

                  {/* Evento (con copy del code) */}
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">{item.event.title ?? '—'}</div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <KeyRound className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[260px]">{item.event.code ?? '—'}</span>

                      {item.event.code ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void copyToClipboard(item.event.code!);
                          }}
                          title="Copiar código del evento"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span className="sr-only">Copiar</span>
                        </button>
                      ) : null}
                    </div>
                  </td>

                  {/* Fecha */}
                  <td className="px-4 py-3 align-top">
                    <div className="text-sm">{formatEventDate(item)}</div>
                    <div className="text-muted-foreground text-xs">Emisión</div>
                  </td>

                  {/* Archivo */}
                  <td className="px-4 py-3 align-top">
                    <div className="inline-flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span className="text-xs">PDF</span>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3 align-top">{renderStatus(item)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DocumentsPagination
        page={page}
        totalPages={totalPages}
        hasPrev={data.pagination.has_prev_page}
        hasNext={data.pagination.has_next_page}
        loading={loading}
        onPrev={() => void load(page - 1)}
        onNext={() => void load(page + 1)}
      />
    </div>
  );
}
