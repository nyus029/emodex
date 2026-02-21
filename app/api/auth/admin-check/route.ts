import { jsonSuccess, jsonError } from '@/lib/api-utils';
import { auth0 } from '@/lib/auth0';
import { getSystemAdministratorAccessByEmail } from '@/lib/system-administrators';

export async function GET() {
  try {
    const session = await auth0.getSession();
    const email = session?.user?.email;

    if (!email) {
      return jsonSuccess({ isAdmin: false });
    }

    const access = await getSystemAdministratorAccessByEmail(email);
    return jsonSuccess({ isAdmin: access.hasAccess });
  } catch (err) {
    console.error('Admin check error:', err);
    return jsonError('管理者チェックに失敗しました', 500);
  }
}
