'use server';

import { dxFetch } from '../_helpers/fetch';

export const fn_delete_document_category = async (id: number): Promise<void> => {
  try {
    await dxFetch<void>(`/document-categories/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_delete_document_category:', err);
    throw err;
  }
};
