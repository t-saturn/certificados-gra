'use server';

import { dxFetch } from '../_helpers/fetch';
import type { UserDetail } from '@/types/dx.types';

export const fn_get_user_detail_by_id = async (id: string): Promise<UserDetail> => {
  try {
    return await dxFetch<UserDetail>(`/user-details/${id}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_get_user_detail_by_id:', err);
    throw err;
  }
};
