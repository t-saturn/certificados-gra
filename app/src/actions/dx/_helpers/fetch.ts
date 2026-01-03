'use server';

import { auth } from '@/lib/auth';
import type { ExtendedSession } from '@/types/auth.types';

// -- dx api fetch helper

const SERVER_API_URL = process.env.SERVER_API_URL ?? 'http://localhost:8002';

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

// eslint-disable-next-line prettier/prettier
export const dxFetch = async <T,>(endpoint: string, options: FetchOptions = {}): Promise<T> => {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.accessToken) {
    throw new Error('No hay sesión activa');
  }

  const { method = 'GET', body } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${SERVER_API_URL}${endpoint}`, config);

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || error.error || `Error: ${res.statusText}`);
  }

  const data: T = await res.json();
  return data;
};

export const buildQueryParams = (params: Record<string, string | number | boolean | undefined>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};
