'use server';

import { dxFetch } from '../_helpers/fetch';
import type { DocumentCategory } from '@/types/dx.types';

export const fn_get_document_category_by_id = async (id: number): Promise<DocumentCategory> => {
  try {
    return await dxFetch<DocumentCategory>(`/document-categories/${id}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_get_document_category_by_id:', err);
    throw err;
  }
};
