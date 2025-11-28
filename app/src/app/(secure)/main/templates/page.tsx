'use client';

import type { FC, FormEvent } from 'react';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Eye, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// 🔹 Importa el server action y tipos
import { fn_get_templates, type TemplateItem, type TemplatesFilters } from '@/actions/fn-template';

type LoadTemplatesOptions = {
  page?: number;
  search?: string;
  type?: string;
};

const TemplatesPage: FC = () => {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [filters, setFilters] = useState<TemplatesFilters | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  const [pageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadTemplates = (opts?: LoadTemplatesOptions): void => {
    startTransition(async () => {
      try {
        const result = await fn_get_templates({
          page: opts?.page ?? page,
          page_size: pageSize,
          search_query: opts?.search ?? (search || undefined),
          type: opts?.type ?? typeFilter,
        });

        setTemplates(result.templates);
        setFilters(result.filters);
        setPage(result.filters.page);
        setError(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error(err);
        const message = err?.message ?? 'Ocurrió un error al obtener las plantillas.';
        setError(message);
        toast.error('No se pudieron cargar las plantillas', {
          description: message,
        });
      }
    });
  };

  // 🔹 Cargar la primera página al montar
  useEffect(() => {
    loadTemplates({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    loadTemplates({ page: 1, search });
  };

  const handleTypeChange = (value: string): void => {
    const type = value === 'all' ? undefined : value;
    setTypeFilter(type);
    loadTemplates({ page: 1, type });
  };

  // Por ahora solo borramos en UI (cuando tengas endpoint, aquí llamas al backend)
  const handleDelete = (id: string): void => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const currentPage = filters?.page ?? page;
  const total = filters?.total ?? 0;

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  const handleRetry = (): void => {
    setError(null);
    loadTemplates({ page: 1 });
  };

  return (
    <div className="space-y-6 bg-background p-6">
      {/* Header */}
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

      {/* Filtros: búsqueda + tipo */}
      <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <Input placeholder="Buscar por nombre o descripción..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Buscar
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Tipo:</span>
          <Select defaultValue="all" onValueChange={handleTypeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="certificate">Certificados</SelectItem>
              <SelectItem value="constancy">Constancias</SelectItem>
              <SelectItem value="recognition">Reconocimientos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Vista amigable de error */}
      {error && (
        <Card className="bg-destructive/5 p-6 border border-destructive/40">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div>
              <h2 className="font-semibold text-destructive text-sm">No se pudieron cargar las plantillas</h2>
              <p className="mt-1 text-muted-foreground text-xs">Ocurrió un problema al comunicarse con el servidor. Por favor, inténtalo nuevamente en unos momentos.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRetry} disabled={isPending} className="mt-1">
              {isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Reintentar
            </Button>
          </div>
        </Card>
      )}

      {/* Estado de carga inicial sin error */}
      {!error && isPending && templates.length === 0 && (
        <div className="flex justify-center items-center py-10 text-muted-foreground text-sm">
          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
          Cargando plantillas...
        </div>
      )}

      {/* Templates Grid */}
      {!error && (
        <>
          {templates.length === 0 && !isPending ? (
            <div className="bg-card p-6 border border-border rounded-md text-muted-foreground text-sm text-center">No se encontraron plantillas con los filtros actuales.</div>
          ) : (
            <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} className="bg-card shadow-sm hover:shadow-lg p-4 border border-border rounded-md transition-shadow">
                  <div className="space-y-4">
                    {/* Template Header */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-foreground text-sm">{template.name}</h3>

                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-wide
                          ${
                            template.document_type_code === 'CERTIFICATE' ? 'border-primary/20 bg-primary/10 text-primary' : 'border-accent/20 bg-accent/10 text-accent-foreground'
                          }`}
                        >
                          {template.document_type_name}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">{template.description}</p>
                      {template.category_name && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Categoría: <span className="font-medium">{template.category_name}</span>
                        </p>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="space-y-1 text-muted-foreground text-xs">
                      <p>Creada: {formatDate(template.created_at)}</p>
                      <p>Actualizada: {formatDate(template.updated_at)}</p>
                    </div>

                    {/* Preview Area */}
                    <div className="flex justify-center items-center bg-muted p-4 border border-border rounded min-h-32">
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Vista Previa</p>
                        <p className="mt-2 text-muted-foreground text-xs">Campos variables (ejemplo):</p>
                        <p className="mt-1 font-mono text-muted-foreground text-xs">
                          {'{'} nombre, dni, evento, horas {'}'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-border border-t">
                      <Button variant="ghost" size="sm" className="flex-1 gap-2 text-muted-foreground hover:text-foreground">
                        <Eye className="w-4 h-4" />
                        Ver
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 gap-2 text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-4 h-4" />
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 gap-2 text-destructive hover:text-destructive/80" onClick={() => handleDelete(template.id)}>
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Paginado */}
          {filters && templates.length > 0 && (
            <div className="flex md:flex-row flex-col justify-between items-center gap-3 pt-4 border-border border-t text-muted-foreground text-xs">
              <div>
                Página <span className="font-medium">{currentPage}</span>
                {total > 0 && (
                  <>
                    {' '}
                    · Total: <span className="font-medium">{total}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={isPending || !filters.has_prev_page} onClick={() => loadTemplates({ page: currentPage - 1 })}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={isPending || !filters.has_next_page} onClick={() => loadTemplates({ page: currentPage + 1 })}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TemplatesPage;
