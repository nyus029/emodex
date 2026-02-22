import { prisma } from '@/lib/prisma';
import { requireAuth, jsonSuccess } from '@/lib/api-utils';
import { getCooldownStatus } from '@/lib/mood-cooldown';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth.session;

  const latest = await prisma.moodRecord.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  const status = getCooldownStatus(latest?.createdAt ?? null);
  return jsonSuccess(status);
}
