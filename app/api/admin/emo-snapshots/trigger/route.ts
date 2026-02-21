import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { getSystemAdministratorAccessByEmail } from '@/lib/system-administrators';
import { createDailySnapshots } from '@/lib/emo-snapshots';

export async function POST() {
  const session = await auth0.getSession();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await getSystemAdministratorAccessByEmail(email);
  if (!access.currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!access.hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
