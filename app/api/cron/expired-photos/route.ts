import { NextResponse } from 'next/server';
import { deleteExpiredPhotos } from '@/lib/expired-photos';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await deleteExpiredPhotos();

  return NextResponse.json(
    {
      ok: true,
      storagesProcessed: result.storagesProcessed,
      blobsDeleted: result.blobsDeleted,
    },
    { status: 200 },
  );
}
