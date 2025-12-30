import { NextResponse } from 'next/server';
import { auth } from './lib/auth';

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;

  const protectedPaths = ['/main', '/admin', '/profile', '/certificates'];
  const authPaths = ['/login', '/register'];

  const isProtectedPath = protectedPaths.some((path) => nextUrl.pathname.startsWith(path));
  const isAuthPath = authPaths.some((path) => nextUrl.pathname.startsWith(path));

  if (isProtectedPath && !isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath && isLoggedIn) {
    return NextResponse.redirect(new URL('/main', nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|img|manifest.json|robots.txt|sitemap.xml).*)'],
};
