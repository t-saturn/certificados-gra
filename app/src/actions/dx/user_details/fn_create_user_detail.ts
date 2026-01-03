'use server';

import { dxFetch } from '../_helpers/fetch';
import type { UserDetail, CreateUserDetailInput } from '@/types/dx.types';

export const fn_create_user_detail = async (input: CreateUserDetailInput): Promise<UserDetail> => {
  try {
    return await dxFetch<UserDetail>('/user-details', {
      method: 'POST',
      body: input,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_create_user_detail:', err);
    throw err;
  }
};
