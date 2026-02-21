import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isDbMockEnabled } from '@/lib/db-mock';

export async function GET() {
  if (isDbMockEnabled()) {
    return NextResponse.json(
      { message: 'Database mock mode enabled' },
      { status: 200 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { message: 'Database connection is healthy' },
      { status: 200 },
    );
  } catch (error) {
    const details =
      error instanceof Error ? error.message : 'Unknown database error';

    return NextResponse.json(
      { message: 'Database connection failed', details },
      { status: 503 },
    );
  }
}
