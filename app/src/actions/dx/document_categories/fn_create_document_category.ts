'use server';

import { dxFetch } from '../_helpers/fetch';
import type { DocumentCategory, CreateDocumentCategoryInput } from '@/types/dx.types';

export const fn_create_document_category = async (input: CreateDocumentCategoryInput): Promise<DocumentCategory> => {
  try {
    return await dxFetch<DocumentCategory>('/document-categories', {
      method: 'POST',
      body: input,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_create_document_category:', err);
    throw err;
  }
};
