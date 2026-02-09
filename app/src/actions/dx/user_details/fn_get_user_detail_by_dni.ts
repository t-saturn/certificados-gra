'use server';

import { dxFetch } from '../_helpers/fetch';
import type { UserDetail } from '@/types/dx.types';

export const fn_get_user_detail_by_dni = async (nationalId: string): Promise<UserDetail> => {
  try {
    return await dxFetch<UserDetail>(`/user-details/dni/${nationalId}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_get_user_detail_by_dni:', err);
    throw err;
  }
};
