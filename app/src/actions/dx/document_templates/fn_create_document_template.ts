'use server';

import { dxFetch } from '../_helpers/fetch';
import type { DocumentTemplate, CreateDocumentTemplateInput } from '@/types/dx.types';

export const fn_create_document_template = async (input: CreateDocumentTemplateInput): Promise<DocumentTemplate> => {
  try {
    return await dxFetch<DocumentTemplate>('/document-templates', {
      method: 'POST',
      body: input,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_create_document_template:', err);
    throw err;
  }
};
