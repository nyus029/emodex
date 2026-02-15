import { NextResponse } from 'next/server';

// Block production traffic until the pre-release lock is lifted via env toggle.
const isProduction = process.env.VERCEL_ENV === 'production';
const isPreReleaseLocked = process.env.PRE_RELEASE_LOCK !== 'false';

export function middleware() {
  if (!isProduction || !isPreReleaseLocked) {
    return NextResponse.next();
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|icon|apple-icon|manifest.webmanifest|sw\\.js|api/health|api/health/db).*)',
  ],
};
