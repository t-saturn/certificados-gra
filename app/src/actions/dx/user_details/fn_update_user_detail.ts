'use server';

import { dxFetch } from '../_helpers/fetch';
import type { UserDetail, UpdateUserDetailInput } from '@/types/dx.types';

export const fn_update_user_detail = async (id: string, input: UpdateUserDetailInput): Promise<UserDetail> => {
  try {
    return await dxFetch<UserDetail>(`/user-details/${id}`, {
      method: 'PUT',
      body: input,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_update_user_detail:', err);
    throw err;
  }
};
