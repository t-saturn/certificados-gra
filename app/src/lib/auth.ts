/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  session: { strategy: 'jwt' },

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;

        //  este es el user_id de Keycloak
        // profile.sub viene del id_token/userinfo
        token.userId = profile?.sub ?? token.sub;
      }
      return token;
    },

    async session({ session, token }) {
      (session.user as any).id = token.userId;

      (session as any).accessToken = token.accessToken;
      (session as any).idToken = token.idToken;

      return session;
    },
  },
});
