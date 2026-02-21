import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth0 } from './lib/auth0';

const isProduction = process.env.VERCEL_ENV === 'production';
const isPreReleaseLocked = process.env.PRE_RELEASE_LOCK !== 'false';

export async function proxy(request: Request) {
  if (isProduction && isPreReleaseLocked) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  const authResponse = await auth0.middleware(request);
  const { pathname, search } = new URL(request.url);

  if (
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/') ||
    pathname === '/login'
  ) {
    return authResponse;
  }

  const session = await auth0.getSession(request as NextRequest);
  if (!session?.user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('returnTo', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return authResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|icon|apple-icon|manifest.webmanifest|sw\\.js|api/health|api/health/db|sitemap.xml|robots.txt).*)',
  ],
};
