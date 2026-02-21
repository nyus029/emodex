import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth0 } from './lib/auth0';

export async function proxy(request: Request) {
  const authResponse = await auth0.middleware(request);
  const { pathname, search } = new URL(request.url);

  if (pathname.startsWith('/auth/') || pathname === '/login') {
    return authResponse;
  }

  const session = await auth0.getSession(request as NextRequest);
  if (!session?.user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('returnTo', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return authResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|icon|apple-icon|manifest.webmanifest|sw\\.js|push-sw\\.js|sitemap.xml|robots.txt|api/cron|api/health|api/docs).*)',
  ],
};
