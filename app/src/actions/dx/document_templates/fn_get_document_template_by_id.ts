'use server';

import { dxFetch } from '../_helpers/fetch';
import type { DocumentTemplate } from '@/types/dx.types';

export const fn_get_document_template_by_id = async (id: string): Promise<DocumentTemplate> => {
  try {
    return await dxFetch<DocumentTemplate>(`/document-templates/${id}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_get_document_template_by_id:', err);
    throw err;
  }
};
