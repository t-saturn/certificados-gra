'use server';

import { dxFetch, buildQueryParams } from '../_helpers/fetch';
import type { DocumentCategory, PaginationParams } from '@/types/dx.types';

export const fn_get_document_categories = async (params?: PaginationParams): Promise<DocumentCategory[]> => {
  try {
    const query = buildQueryParams({
      limit: params?.limit,
      offset: params?.offset,
    });
    return await dxFetch<DocumentCategory[]>(`/document-categories${query}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_get_document_categories:', err);
    throw err;
  }
};
