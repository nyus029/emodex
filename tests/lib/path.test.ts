import { toPathSegment } from '@/lib/path';

describe('toPathSegment', () => {
  it('normalizes spaces and slashes', () => {
    const result = toPathSegment('  family/ trip \\ 2026  ');
    expect(result).toBe('family-trip-2026');
  });

  it('falls back to untitled', () => {
    const result = toPathSegment('   ');
    expect(result).toBe('untitled');
  });
});
