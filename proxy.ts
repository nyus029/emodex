import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth0 } from './lib/auth0';

export async function proxy(request: Request) {
  const { pathname, search } = new URL(request.url);
  const maintenanceForbidAll = process.env.MAINTENANCE_FORBID_ALL === 'true';

  if (maintenanceForbidAll) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return new NextResponse('Forbidden', { status: 403 });
  }

  const authResponse = await auth0.middleware(request);

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
  matcher: ['/:path*'],
};
