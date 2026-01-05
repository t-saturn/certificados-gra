'use server';

import { dxFetch } from '../_helpers/fetch';
import type { DocumentTemplate, UpdateDocumentTemplateInput } from '@/types/dx.types';

export const fn_update_document_template = async (id: string, input: UpdateDocumentTemplateInput): Promise<DocumentTemplate> => {
  try {
    return await dxFetch<DocumentTemplate>(`/document-templates/${id}`, {
      method: 'PUT',
      body: input,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_update_document_template:', err);
    throw err;
  }
};
