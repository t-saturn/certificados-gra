'use server';

import { dxFetch } from '../_helpers/fetch';
import type { DocumentTemplate } from '@/types/dx.types';

export const fn_get_active_document_templates = async (): Promise<DocumentTemplate[]> => {
  try {
    return await dxFetch<DocumentTemplate[]>('/document-templates/active');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_get_active_document_templates:', err);
    throw err;
  }
};
