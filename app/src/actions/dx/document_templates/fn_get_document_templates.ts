'use server';

import { dxFetch, buildQueryParams } from '../_helpers/fetch';
import type { DocumentTemplate, PaginationParams } from '@/types/dx.types';

export const fn_get_document_templates = async (params?: PaginationParams): Promise<DocumentTemplate[]> => {
  try {
    const query = buildQueryParams({
      limit: params?.limit,
      offset: params?.offset,
    });
    return await dxFetch<DocumentTemplate[]>(`/document-templates${query}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_get_document_templates:', err);
    throw err;
  }
};
