'use client';

import { useMemo } from 'react';
import { KeyRound, Copy, Package, FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { CertificateDetail } from '@/actions/fn-certificates';

type Props = {
  certificate: CertificateDetail;
};

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

function StatusBadge({ status }: { status: CertificateDetail['status'] }) {
  if (status === 'GENERATED') return <Badge className="bg-green-600">Listo</Badge>;
  if (status === 'REJECTED') return <Badge variant="destructive">Rechazado</Badge>;
  return <Badge variant="secondary">Pendiente</Badge>;
}

export default function DocumentDetailClient({ certificate }: Props) {
  const fullName = useMemo(() => {
    const ud = certificate.user_detail;
    if (!ud) return '—';
    return `${ud.first_name} ${ud.last_name}`.trim();
  }, [certificate.user_detail]);

  const previewFileId = useMemo(() => {
    const pdfs = certificate.pdfs ?? [];
    const final = pdfs.find((p) => p.stage?.toLowerCase() === 'final');
    return final?.file_id ?? pdfs[0]?.file_id ?? null;
  }, [certificate.pdfs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Detalle del documento</h1>
          <p className="text-muted-foreground mt-1">Revisa la información del certificado y sus archivos asociados.</p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={certificate.status} />
          {previewFileId ? (
            <Button variant="outline" asChild>
              <a href={`/files/${previewFileId}`} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4 mr-2" />
                Ver PDF
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Info principal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identificadores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <div className="text-muted-foreground flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Código del documento
              </div>
              <div className="font-medium">{certificate.serial_code}</div>
            </div>

            <Button variant="outline" size="sm" onClick={() => void copyToClipboard(certificate.serial_code)}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </div>

          <div className="text-sm">
            <div className="text-muted-foreground">Código de verificación</div>
            <div className="font-medium">{certificate.verification_code}</div>
          </div>

          <div className="text-sm">
            <div className="text-muted-foreground">Fecha de emisión</div>
            <div className="font-medium">{certificate.issue_date}</div>
          </div>
        </CardContent>
      </Card>

      {/* Participante y Evento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Participante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <div className="text-muted-foreground">Nombre</div>
              <div className="font-medium">{fullName}</div>
            </div>
            <div>
              <div className="text-muted-foreground">DNI</div>
              <div className="font-medium">{certificate.user_detail?.national_id ?? '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Email</div>
              <div className="font-medium">{certificate.user_detail?.email ?? '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Teléfono</div>
              <div className="font-medium">{certificate.user_detail?.phone ?? '—'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <div className="text-muted-foreground">Título</div>
              <div className="font-medium">{certificate.event?.title ?? '—'}</div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-muted-foreground">Código</div>
                <div className="font-medium">{certificate.event?.code ?? '—'}</div>
              </div>

              {certificate.event?.code ? (
                <Button variant="outline" size="sm" onClick={() => void copyToClipboard(certificate.event!.code)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              ) : null}
            </div>

            <div>
              <div className="text-muted-foreground">Lugar</div>
              <div className="font-medium">{certificate.event?.location ?? '—'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Archivos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Archivos asociados</CardTitle>
        </CardHeader>
        <CardContent>
          {(certificate.pdfs?.length ?? 0) === 0 ? (
            <div className="text-sm text-muted-foreground">Aún no hay archivos asociados.</div>
          ) : (
            <div className="space-y-2">
              {certificate.pdfs!.map((pdf) => (
                <div key={pdf.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm">
                      <div className="font-medium">{pdf.file_name}</div>
                      <div className="text-muted-foreground text-xs">
                        Stage: {pdf.stage} · v{pdf.version}
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <a href={`/files/${pdf.file_id}`} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-2" />
                      Ver
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
