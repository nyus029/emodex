import { NextResponse } from 'next/server';
import { mastraStorageKind } from '@/mastra';

/**
 * GET /api/health/storage
 * Returns whether Mastra storage is using Turso or local file.
 */
export async function GET() {
  return NextResponse.json({
    mastraStorage: mastraStorageKind,
    tursoConfigured: mastraStorageKind === 'turso',
  });
}
