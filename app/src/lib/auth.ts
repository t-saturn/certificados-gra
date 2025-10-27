import NextAuth from 'next-auth';

export const { auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },
  trustHost: true,
  providers: [], // ← sin providers
  cookies: {
    sessionToken: {
      name: 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.COOKIE_DOMAIN, // .localtest.me
      },
    },
  },
  callbacks: {
    async session({ session, token }) {
      if (token?.userId) {
        session.user = { ...(session.user || {}), id: String(token.userId) };
      }
      return session;
    },
  },
});
