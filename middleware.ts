import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';

const isProduction = process.env.VERCEL_ENV === 'production';
const isPreReleaseLocked = process.env.PRE_RELEASE_LOCK !== 'false';

export async function middleware(request: NextRequest) {
  if (isProduction && isPreReleaseLocked) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|icon|apple-icon|manifest.webmanifest|sw\\.js|api/health|api/health/db|sitemap.xml|robots.txt).*)',
  ],
};
