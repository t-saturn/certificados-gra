import { fn_list_certificates } from '@/actions/fn-certificates';
import DocumentsClientPage from './_components/page';

export default async function DocumentsPage() {
  const initialData = await fn_list_certificates({
    page: 1,
    page_size: 10,
    status: 'all',
  });

  return <DocumentsClientPage initialData={initialData} />;
}
