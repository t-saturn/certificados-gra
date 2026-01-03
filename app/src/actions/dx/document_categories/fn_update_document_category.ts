'use server';

import { dxFetch } from '../_helpers/fetch';
import type { DocumentCategory, UpdateDocumentCategoryInput } from '@/types/dx.types';

export const fn_update_document_category = async (id: number, input: UpdateDocumentCategoryInput): Promise<DocumentCategory> => {
  try {
    return await dxFetch<DocumentCategory>(`/document-categories/${id}`, {
      method: 'PUT',
      body: input,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_update_document_category:', err);
    throw err;
  }
};
