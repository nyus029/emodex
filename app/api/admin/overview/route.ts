import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { getSystemAdministratorAccessByEmail } from '@/lib/system-administrators';
import { getSystemOverview } from '@/lib/services/admin-service';

export async function GET() {
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

  const payload = await getSystemOverview({
    id: access.currentUser.id,
    name: access.currentUser.name,
    email: access.currentUser.email,
    isRegisteredAdmin: access.isRegisteredAdmin,
    isBootstrapAdmin: access.isBootstrapAdmin,
  });

  return NextResponse.json(payload, { status: 200 });
}
