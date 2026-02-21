import { NextResponse } from 'next/server';
import { createDailySnapshots } from '@/lib/emo-snapshots';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await createDailySnapshots();

  return NextResponse.json(
    {
      ok: true,
      snapshotsUpserted: result.upserted,
      date: result.date,
    },
    { status: 200 },
  );
}
