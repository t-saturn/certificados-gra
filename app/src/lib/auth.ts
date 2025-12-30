import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';
import type { NextAuthConfig } from 'next-auth';
import type { ExtendedJWT, ExtendedSession, KeycloakProfile, KeycloakTokenResponse } from '@/types/auth.types';

const refreshAccessToken = async (token: ExtendedJWT): Promise<ExtendedJWT> => {
  try {
    const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.KEYCLOAK_CLIENT_ID!,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens: KeycloakTokenResponse = await response.json();

    if (!response.ok) {
      throw new Error('Error al refrescar token');
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      idToken: refreshedTokens.id_token,
      expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error refrescando access token:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
};

const parseJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const authConfig: NextAuthConfig = {
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: { strategy: 'jwt' },
  trustHost: true,
  callbacks: {
    jwt: async ({ token, account, profile }): Promise<ExtendedJWT> => {
      if (account && profile) {
        const keycloakProfile = profile as KeycloakProfile;
        const decoded = account.access_token ? parseJwtPayload(account.access_token) : null;
        const realmAccess = decoded?.realm_access as { roles?: string[] } | undefined;

        return {
          ...token,
          accessToken: account.access_token,
          idToken: account.id_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          userId: keycloakProfile.sub ?? token.sub,
          roles: realmAccess?.roles ?? keycloakProfile.realm_access?.roles ?? [],
        };
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = token.expiresAt as number;

      if (now < expiresAt - 60) {
        return token as ExtendedJWT;
      }

      return await refreshAccessToken(token as ExtendedJWT);
    },

    session: async ({ session, token }): Promise<ExtendedSession> => {
      const extendedToken = token as ExtendedJWT;

      return {
        ...session,
        user: {
          ...session.user,
          id: extendedToken.userId ?? extendedToken.sub ?? '',
          roles: extendedToken.roles,
        },
        accessToken: extendedToken.accessToken,
        idToken: extendedToken.idToken,
        refreshToken: extendedToken.refreshToken,
        expiresAt: extendedToken.expiresAt,
        error: extendedToken.error,
      };
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
