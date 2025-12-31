import type { DefaultSession } from 'next-auth';
import type { JWT as DefaultJWT } from 'next-auth/jwt';

export type ExtendedUser = DefaultSession['user'] & {
  id: string;
  roles?: string[];
};

export type ExtendedSession = DefaultSession & {
  user: ExtendedUser;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
};

export type ExtendedJWT = DefaultJWT & {
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  userId?: string;
  roles?: string[];
  error?: string;
};

export type KeycloakProfile = {
  sub: string;
  email_verified: boolean;
  name: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  email: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
};

export type KeycloakTokenResponse = {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  scope: string;
};
