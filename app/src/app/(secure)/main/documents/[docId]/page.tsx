'use server';

import type { JSX } from 'react';
import { fn_get_certificate_by_id, type CertificateDetailResponse } from '@/actions/fn-certificates';
import DocumentDetailPage from './_components/page';

type PageParams = {
  docId: string;
};

export default async function Page({ params }: { params: Promise<PageParams> }): Promise<JSX.Element> {
  const { docId } = await params;

  const data: CertificateDetailResponse = await fn_get_certificate_by_id(docId);

  return <DocumentDetailPage certificate={data.certificate} />;
}
