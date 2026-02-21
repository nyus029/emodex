import PortfolioList from '@/components/portfolio/PortfolioList';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

type PortfolioItem = {
  id: number;
  name: string;
};

async function getPortfolioItems(email: string): Promise<PortfolioItem[]> {
  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!dbUser) {
    return [];
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: dbUser.id },
    include: { group: true },
  });

  return memberships.map((membership) => ({
    id: membership.groupId,
    name: membership.group.groupName,
  }));
}

export default async function PortfolioFeature() {
  const session = await auth0.getSession();
  const email = session?.user?.email;

  const groups = email ? await getPortfolioItems(email) : [];

  return (
    <div className="bg-background-light p-5">
      <div className="mx-auto max-w-md space-y-4">
        {!email ? (
          <PortfolioList
            items={[]}
            emptyMessage="ログイン後にグループ一覧を表示できます。"
          />
        ) : (
          <PortfolioList
            items={groups}
            emptyMessage="表示できるグループがありません。"
          />
        )}
      </div>
    </div>
  );
}
