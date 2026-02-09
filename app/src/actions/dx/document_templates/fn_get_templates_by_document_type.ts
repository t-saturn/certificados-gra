'use server';

import { dxFetch } from '../_helpers/fetch';
import type { DocumentTemplate } from '@/types/dx.types';

export const fn_get_templates_by_document_type = async (documentTypeId: string): Promise<DocumentTemplate[]> => {
  try {
    return await dxFetch<DocumentTemplate[]>(`/document-templates/document-type/${documentTypeId}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_get_templates_by_document_type:', err);
    throw err;
  }
};
