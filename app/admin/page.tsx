import AdminFeature from '@/features/admin/AdminFeature';
import { auth0 } from '@/lib/auth0';
import { getSystemAdministratorAccessByEmail } from '@/lib/system-administrators';

export default async function AdminPage() {
  const session = await auth0.getSession();
  const email = session?.user?.email;

  if (!email) {
    return (
      <div className="min-h-screen bg-background-light p-5">
        <main className="mx-auto max-w-md rounded-xl bg-white px-5 py-4 shadow-card">
          <h1 className="text-lg font-semibold text-black">Unauthorized</h1>
          <p className="mt-1 text-sm text-gray-500">
            ログイン後に再度アクセスしてください。
          </p>
        </main>
      </div>
    );
  }

  const access = await getSystemAdministratorAccessByEmail(email);
  if (!access.hasAccess) {
    return (
      <div className="min-h-screen bg-background-light p-5">
        <main className="mx-auto max-w-md rounded-xl bg-white px-5 py-4 shadow-card">
          <h1 className="text-lg font-semibold text-black">Forbidden</h1>
          <p className="mt-1 text-sm text-gray-500">
            このページは system administrator のみアクセスできます。
          </p>
        </main>
      </div>
    );
  }

  return <AdminFeature />;
}
