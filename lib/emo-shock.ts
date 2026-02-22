import { prisma } from '@/lib/prisma';

export const SHOCK_MULTIPLIER = 0.5;
export const DEFAULT_RECOVERY_DAYS = 7;

export interface ShockEvent {
  shockRate: number;
  shockedAt: Date;
  recoveryDays: number;
}

/**
 * ショックの残存影響を計算し、0〜1 の乗数を返す。
 * 1.0 = 影響なし、0.0 = 完全暴落。
 *
 * スタッキング:
 * - イベントを shockedAt 昇順でソート
 * - 各ショックは「その時点の値」に対して (1 - shockRate) を乗算
 * - asOfDate 時点では各ショックの線形回復分を加算
 * - 回復済み（経過日 >= recoveryDays）のショックは無視
 */
export function calculateShockMultiplier(
  events: ShockEvent[],
  asOfDate?: Date,
): number {
  if (events.length === 0) return 1.0;

  const now = asOfDate ?? new Date();
  const msPerDay = 86_400_000;

  const sorted = [...events].sort(
    (a, b) => a.shockedAt.getTime() - b.shockedAt.getTime(),
  );

  let multiplier = 1.0;

  for (const event of sorted) {
    const elapsedDays = (now.getTime() - event.shockedAt.getTime()) / msPerDay;

    if (elapsedDays < 0 || elapsedDays >= event.recoveryDays) {
      continue;
    }

    const recoveryProgress = Math.max(0, elapsedDays / event.recoveryDays);
    const currentImpact = event.shockRate * (1 - recoveryProgress);
    multiplier *= 1 - currentImpact;
  }

  return Math.max(0, multiplier);
}

/**
 * DB からアクティブなショックイベント（回復ウィンドウ内のもの）を取得。
 * albumId ごとに ShockEvent[] を返す。
 */
export async function getActiveShockEvents(
  albumIds: string[],
): Promise<Map<string, ShockEvent[]>> {
  const result = new Map<string, ShockEvent[]>();
  if (albumIds.length === 0) return result;

  const records = await prisma.emoShockEvent.findMany({
    where: {
      albumId: { in: albumIds },
    },
    select: {
      albumId: true,
      shockRate: true,
      shockedAt: true,
      recoveryDays: true,
    },
    orderBy: { shockedAt: 'asc' },
  });

  const now = new Date();
  const msPerDay = 86_400_000;

  for (const record of records) {
    const elapsed = (now.getTime() - record.shockedAt.getTime()) / msPerDay;
    if (elapsed >= record.recoveryDays) continue;

    const existing = result.get(record.albumId) ?? [];
    existing.push({
      shockRate: record.shockRate,
      shockedAt: record.shockedAt,
      recoveryDays: record.recoveryDays,
    });
    result.set(record.albumId, existing);
  }

  return result;
}

/**
 * 指定日が下落中かどうか判定（チャート赤色用）。
 * いずれかのショックイベントの回復ウィンドウ内なら true。
 */
export function isInDecline(events: ShockEvent[], asOfDate: Date): boolean {
  if (events.length === 0) return false;

  const msPerDay = 86_400_000;

  return events.some((event) => {
    const elapsed = (asOfDate.getTime() - event.shockedAt.getTime()) / msPerDay;
    return elapsed >= 0 && elapsed < event.recoveryDays;
  });
}
