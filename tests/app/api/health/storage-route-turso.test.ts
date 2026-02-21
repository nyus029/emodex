/**
 * GET /api/health/storage — when storage is Turso
 */
jest.mock('@/mastra', () => ({
  mastraStorageKind: 'turso',
}));

import { GET } from '@/app/api/health/storage/route';

describe('GET /api/health/storage (Turso)', () => {
  it('returns tursoConfigured true when mastraStorageKind is turso', async () => {
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('mastraStorage', 'turso');
    expect(body).toHaveProperty('tursoConfigured', true);
  });
});
