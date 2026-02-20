import AdminFeature from '@/features/admin/AdminFeature';
import { auth0 } from '@/lib/auth0';
import { getSystemAdministratorAccessByEmail } from '@/lib/system-administrators';

export default async function AdminPage() {
  const session = await auth0.getSession();
  const email = session?.user?.email;

  if (!email) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-6 py-10">
        <h1 className="text-2xl font-bold">Unauthorized</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          ログイン後に再度アクセスしてください。
        </p>
      </main>
    );
  }

  const access = await getSystemAdministratorAccessByEmail(email);
  if (!access.hasAccess) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-6 py-10">
        <h1 className="text-2xl font-bold">Forbidden</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          このページは system administrator のみアクセスできます。
        </p>
      </main>
    );
  }

  return <AdminFeature />;
}
