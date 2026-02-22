import { NextResponse } from 'next/server';
import { executeDueDividends } from '@/lib/auto-dividend';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await executeDueDividends();

  return NextResponse.json(
    {
      ok: true,
      processedStorages: result.processedStorages,
      createdEvents: result.createdEvents,
      skippedReasonCounts: result.skippedReasonCounts,
    },
    { status: 200 },
  );
}
