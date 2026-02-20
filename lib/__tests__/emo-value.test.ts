import {
  DAILY_RATE,
  BASE_EMO_PER_PHOTO,
  calculatePhotoStorageEmo,
  calculateAlbumEmo,
  calculateDayOverDayChange,
  type StorageParams,
} from '../emo-value';

describe('emo-value constants', () => {
  it('DAILY_RATE is approximately 0.006334', () => {
    expect(DAILY_RATE).toBeCloseTo(0.006334, 4);
  });

  it('BASE_EMO_PER_PHOTO is 100', () => {
    expect(BASE_EMO_PER_PHOTO).toBe(100);
  });
});

describe('calculatePhotoStorageEmo', () => {
  it('1 photo × 100 emo × 0 days = 100', () => {
    const now = new Date('2026-03-01T00:00:00Z');
    const result = calculatePhotoStorageEmo({
      photoCount: 1,
      baseEmoPerPhoto: 100,
      compoundStartDate: now,
      isCompoundActive: true,
      asOfDate: now,
    });
    expect(result).toBe(100);
  });

  it('1 photo × 100 emo × 365 days ≈ 1000 (10x growth)', () => {
    const start = new Date('2025-03-01T00:00:00Z');
    const asOf = new Date('2026-03-01T00:00:00Z');
    const result = calculatePhotoStorageEmo({
      photoCount: 1,
      baseEmoPerPhoto: 100,
      compoundStartDate: start,
      isCompoundActive: true,
      asOfDate: asOf,
    });
    expect(result).toBeCloseTo(1000, -1);
  });

  it('isCompoundActive=false returns 0', () => {
    const result = calculatePhotoStorageEmo({
      photoCount: 5,
      baseEmoPerPhoto: 100,
      compoundStartDate: new Date('2026-01-01'),
      isCompoundActive: false,
      asOfDate: new Date('2026-06-01'),
    });
    expect(result).toBe(0);
  });

  it('photoCount=0 returns 0', () => {
    const result = calculatePhotoStorageEmo({
      photoCount: 0,
      baseEmoPerPhoto: 100,
      compoundStartDate: new Date('2026-01-01'),
      isCompoundActive: true,
      asOfDate: new Date('2026-06-01'),
    });
    expect(result).toBe(0);
  });

  it('after reinvest base=200 with new start date', () => {
    const start = new Date('2026-03-01T00:00:00Z');
    const asOf = new Date('2026-03-01T00:00:00Z');
    const result = calculatePhotoStorageEmo({
      photoCount: 1,
      baseEmoPerPhoto: 200,
      compoundStartDate: start,
      isCompoundActive: true,
      asOfDate: asOf,
    });
    expect(result).toBe(200);
  });

  it('multiple photos scale linearly', () => {
    const params = {
      photoCount: 1,
      baseEmoPerPhoto: 100,
      compoundStartDate: new Date('2026-01-01T00:00:00Z'),
      isCompoundActive: true,
      asOfDate: new Date('2026-02-01T00:00:00Z'),
    };
    const single = calculatePhotoStorageEmo(params);
    const triple = calculatePhotoStorageEmo({ ...params, photoCount: 3 });
    expect(triple).toBeCloseTo(single * 3, 5);
  });
});

describe('calculateAlbumEmo', () => {
  it('sums multiple storages', () => {
    const asOf = new Date('2026-03-01T00:00:00Z');
    const storages: StorageParams[] = [
      {
        photoCount: 2,
        baseEmoPerPhoto: 100,
        compoundStartDate: asOf,
        isCompoundActive: true,
      },
      {
        photoCount: 3,
        baseEmoPerPhoto: 100,
        compoundStartDate: asOf,
        isCompoundActive: true,
      },
    ];
    const result = calculateAlbumEmo(storages, asOf);
    expect(result).toBe(500);
  });

  it('skips inactive storages', () => {
    const asOf = new Date('2026-03-01T00:00:00Z');
    const storages: StorageParams[] = [
      {
        photoCount: 2,
        baseEmoPerPhoto: 100,
        compoundStartDate: asOf,
        isCompoundActive: true,
      },
      {
        photoCount: 3,
        baseEmoPerPhoto: 100,
        compoundStartDate: asOf,
        isCompoundActive: false,
      },
    ];
    const result = calculateAlbumEmo(storages, asOf);
    expect(result).toBe(200);
  });

  it('empty storages returns 0', () => {
    expect(calculateAlbumEmo([])).toBe(0);
  });
});

describe('calculateDayOverDayChange', () => {
  it('returns positive change for active storage', () => {
    const storages: StorageParams[] = [
      {
        photoCount: 10,
        baseEmoPerPhoto: 100,
        compoundStartDate: new Date('2026-01-01'),
        isCompoundActive: true,
      },
    ];
    const { value, percentage } = calculateDayOverDayChange(storages);
    expect(value).toBeGreaterThan(0);
    expect(percentage).toBeGreaterThan(0);
    expect(percentage).toBeCloseTo(DAILY_RATE * 100, 1);
  });

  it('returns zero change for inactive storage', () => {
    const storages: StorageParams[] = [
      {
        photoCount: 10,
        baseEmoPerPhoto: 100,
        compoundStartDate: new Date('2026-01-01'),
        isCompoundActive: false,
      },
    ];
    const { value, percentage } = calculateDayOverDayChange(storages);
    expect(value).toBe(0);
    expect(percentage).toBe(0);
  });
});
