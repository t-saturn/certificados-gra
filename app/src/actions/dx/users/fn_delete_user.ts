'use server';

import { dxFetch } from '../_helpers/fetch';

export const fn_delete_user = async (id: string): Promise<void> => {
  try {
    await dxFetch<void>(`/users/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_delete_user:', err);
    throw err;
  }
};
