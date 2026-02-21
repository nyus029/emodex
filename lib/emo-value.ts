/** Daily compound rate: 10^(1/365) - 1 ≈ 0.006334 (annual 10x growth) */
export const DAILY_RATE = Math.pow(10, 1 / 365) - 1;

/** Default emo value per photo at initial deposit */
export const BASE_EMO_PER_PHOTO = 100;

export interface StorageParams {
  photoCount: number;
  baseEmoPerPhoto: number;
  compoundStartDate: Date;
  isCompoundActive: boolean;
}

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 86_400_000;
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / msPerDay));
}

export function calculatePhotoStorageEmo(
  params: StorageParams & { asOfDate?: Date },
): number {
  if (!params.isCompoundActive) return 0;
  if (params.photoCount <= 0) return 0;

  const asOf = params.asOfDate ?? new Date();
  const days = daysBetween(params.compoundStartDate, asOf);

  return (
    params.photoCount * params.baseEmoPerPhoto * Math.pow(1 + DAILY_RATE, days)
  );
}

export function calculateAlbumEmo(
  storages: StorageParams[],
  asOfDate?: Date,
): number {
  return storages.reduce(
    (sum, s) => sum + calculatePhotoStorageEmo({ ...s, asOfDate }),
    0,
  );
}

export function calculateAlbumEmoWithBoost(
  storages: StorageParams[],
  boostCount: number,
  asOfDate?: Date,
): number {
  const base = calculateAlbumEmo(storages, asOfDate);
  if (boostCount <= 0) return base;
  return base * (1 + 0.5 * boostCount);
}

export function calculateDayOverDayChange(storages: StorageParams[]): {
  value: number;
  percentage: number;
} {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayValue = calculateAlbumEmo(storages, now);
  const yesterdayValue = calculateAlbumEmo(storages, yesterday);

  const value = todayValue - yesterdayValue;
  const percentage = yesterdayValue > 0 ? (value / yesterdayValue) * 100 : 0;

  return {
    value: Math.round(value * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
  };
}

export function calculateDayOverDayChangeWithBoost(
  storages: StorageParams[],
  boostCount: number,
): {
  value: number;
  percentage: number;
} {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayValue = calculateAlbumEmoWithBoost(storages, boostCount, now);
  const yesterdayValue = calculateAlbumEmo(storages, yesterday);

  const value = todayValue - yesterdayValue;
  const percentage = yesterdayValue > 0 ? (value / yesterdayValue) * 100 : 0;

  return {
    value: Math.round(value * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
  };
}
