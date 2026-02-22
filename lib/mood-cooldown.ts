export const MOOD_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export function getCooldownStatus(latestCreatedAt: Date | null): {
  isCooldown: boolean;
  remainingSeconds: number;
  canSubmitAt: string | null;
} {
  if (!latestCreatedAt) {
    return { isCooldown: false, remainingSeconds: 0, canSubmitAt: null };
  }

  const now = Date.now();
  const elapsed = now - latestCreatedAt.getTime();
  const remaining = MOOD_COOLDOWN_MS - elapsed;

  if (remaining <= 0) {
    return { isCooldown: false, remainingSeconds: 0, canSubmitAt: null };
  }

  return {
    isCooldown: true,
    remainingSeconds: Math.ceil(remaining / 1000),
    canSubmitAt: new Date(
      latestCreatedAt.getTime() + MOOD_COOLDOWN_MS,
    ).toISOString(),
  };
}
