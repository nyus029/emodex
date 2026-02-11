import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
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
