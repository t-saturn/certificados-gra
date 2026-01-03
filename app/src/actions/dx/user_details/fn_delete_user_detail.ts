'use server';

import { dxFetch } from '../_helpers/fetch';

export const fn_delete_user_detail = async (id: string): Promise<void> => {
  try {
    await dxFetch<void>(`/user-details/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_delete_user_detail:', err);
    throw err;
  }
};
