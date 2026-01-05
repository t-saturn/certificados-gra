'use server';

import { dxFetch } from '../_helpers/fetch';

export const fn_delete_document_template = async (id: string): Promise<void> => {
  try {
    await dxFetch<void>(`/document-templates/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_delete_document_template:', err);
    throw err;
  }
};
