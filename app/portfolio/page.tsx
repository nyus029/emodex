import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import PortfolioClient from './PortfolioClient';

type PortfolioItem = {
  id: number;
  name: string;
};

export default async function PortfolioPage() {
  const session = await auth0.getSession();
  const email = session?.user?.email as string | undefined;

  let groups: PortfolioItem[] = [];
  let userId: number | null = null;
  if (email) {
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (dbUser) {
      userId = dbUser.id;
      const memberships = await prisma.membership.findMany({
        where: { userId: dbUser.id },
        include: { group: true },
      });

      groups = memberships.map((membership) => ({
        id: membership.groupId,
        name: membership.group.groupName,
      }));
    }
  }

  return (
    <PortfolioClient
      initialGroups={groups}
      userId={userId}
      isLoggedIn={Boolean(email)}
    />
  );
}
