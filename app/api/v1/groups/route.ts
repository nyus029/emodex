import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { getMockGroups, isDbMockEnabled } from '@/lib/db-mock';

export type MyGroup = {
  groupId: number;
  groupName: string;
  myRole: string;
};

export async function GET() {
  if (isDbMockEnabled()) {
    return NextResponse.json(getMockGroups(), { status: 200 });
  }

  const session = await auth0.getSession();
  const userEmail = session?.user?.email as string | undefined;
  if (!session?.user?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!userEmail) {
    return NextResponse.json([], { status: 200 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true },
  });

  if (!dbUser) {
    return NextResponse.json([], { status: 200 });
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: dbUser.id },
    include: { group: true },
  });

  const groups: MyGroup[] = memberships.map((m) => ({
    groupId: m.groupId,
    groupName: m.group.groupName,
    myRole: m.role,
  }));

  return NextResponse.json(groups, { status: 200 });
}
