/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';
import { JWT } from 'next-auth/jwt';

async function refreshAccessToken(token: JWT): Promise<JWT> {
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

    const refreshedTokens = await response.json();

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
    console.error('Error refrescando access token:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  session: { strategy: 'jwt' },

  trustHost: true,

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        return {
          ...token,
          accessToken: account.access_token,
          idToken: account.id_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          userId: profile.sub ?? token.sub,
        };
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = token.expiresAt as number;

      if (now < expiresAt - 60) {
        return token;
      }

      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      (session.user as any).id = token.userId;
      (session as any).accessToken = token.accessToken;
      (session as any).idToken = token.idToken;
      (session as any).error = token.error;

      return session;
    },
  },
});
