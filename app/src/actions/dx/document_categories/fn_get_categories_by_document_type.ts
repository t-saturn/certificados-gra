'use server';

import { dxFetch } from '../_helpers/fetch';
import type { DocumentCategory } from '@/types/dx.types';

export const fn_get_categories_by_document_type = async (documentTypeId: string): Promise<DocumentCategory[]> => {
  try {
    return await dxFetch<DocumentCategory[]>(`/document-categories/document-type/${documentTypeId}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_get_categories_by_document_type:', err);
    throw err;
  }
};
