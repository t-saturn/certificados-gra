'use server';

import { dxFetch } from '../_helpers/fetch';
import type { User, CreateUserInput } from '@/types/dx.types';

export const fn_create_user = async (input: CreateUserInput): Promise<User> => {
  try {
    return await dxFetch<User>('/users', {
      method: 'POST',
      body: input,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error en fn_create_user:', err);
    throw err;
  }
};
