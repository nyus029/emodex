import React from 'react';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

type PortfolioItem = {
  id: number;
  name: string;
};

export default async function PortfolioPage() {
  const session = await auth0.getSession();
  const email = session?.user?.email as string | undefined;

  let groups: PortfolioItem[] = [];
  if (email) {
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (dbUser) {
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
    <div className="bg-background-light p-5">
      <div className="max-w-md mx-auto space-y-4">
        {!email ? (
          <div className="rounded-xl bg-white p-4 text-sm text-gray-700 shadow-card">
            ログイン後にグループ一覧を表示できます。
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl bg-white p-4 text-sm text-gray-700 shadow-card">
            表示できるグループがありません。
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-2 bg-white rounded-xl shadow-card p-4"
            >
              {/* ユーザーアイコン（削除可能） */}
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-light-gray">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  {/* User Icon */}
                </svg>
              </div>

              <div className="text-gray-800 font-medium">{group.name}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
