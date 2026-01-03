'use server';

import { dxFetch } from '../_helpers/fetch';
import type { User, UpdateUserInput } from '@/types/dx.types';

export const fn_update_user = async (id: string, input: UpdateUserInput): Promise<User> => {
  try {
    return await dxFetch<User>(`/users/${id}`, {
      method: 'PUT',
      body: input,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_update_user:', err);
    throw err;
  }
};
