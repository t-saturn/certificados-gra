'use server';

import { dxFetch, buildQueryParams } from '../_helpers/fetch';
import type { User, PaginationParams } from '@/types/dx.types';

export const fn_get_users = async (params?: PaginationParams): Promise<User[]> => {
  try {
    const query = buildQueryParams({
      limit: params?.limit,
      offset: params?.offset,
    });
    return await dxFetch<User[]>(`/users${query}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_get_users:', err);
    throw err;
  }
};
