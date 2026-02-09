'use server';

import { dxFetch } from '../_helpers/fetch';
import type { User } from '@/types/dx.types';

export const fn_get_user_by_id = async (id: string): Promise<User> => {
  try {
    return await dxFetch<User>(`/users/${id}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_get_user_by_id:', err);
    throw err;
  }
};
