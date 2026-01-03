'use server';

import { dxFetch, buildQueryParams } from '../_helpers/fetch';
import type { UserDetail, PaginationParams } from '@/types/dx.types';

export const fn_get_user_details = async (params?: PaginationParams): Promise<UserDetail[]> => {
  try {
    const query = buildQueryParams({
      limit: params?.limit,
      offset: params?.offset,
    });
    return await dxFetch<UserDetail[]>(`/user-details${query}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_get_user_details:', err);
    throw err;
  }
};
