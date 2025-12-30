import React from 'react';

import { AuditPageHeader } from './_components/audit-page-header';
import { AuditToolbar } from './_components/audit-toolbar';
import { AuditTable } from './_components/audit-table';
import { AuditStatsGrid } from './_components/audit-stats-grid';

const Page: React.FC = () => {
  return (
    <main className="flex flex-col gap-6 px-6 py-4 w-full h-full">
      <AuditPageHeader />

      <section className="flex flex-col gap-4">
        <AuditToolbar />
        <AuditTable />
      </section>

      <AuditStatsGrid />
    </main>
  );
};

export default Page;
