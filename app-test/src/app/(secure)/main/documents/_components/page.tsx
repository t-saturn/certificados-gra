'use client';

import type { FC } from 'react';
import type { CertificateListResponse } from '@/actions/fn-certificates';

import DocumentsHeader from './documents-header';
import DocumentsTable from './documents-table';

type Props = {
  initialData: CertificateListResponse;
};

const DocumentsClientPage: FC<Props> = ({ initialData }) => {
  return (
    <div className="space-y-6 p-6">
      <DocumentsHeader />
      <DocumentsTable initialData={initialData} />
    </div>
  );
};

export default DocumentsClientPage;
