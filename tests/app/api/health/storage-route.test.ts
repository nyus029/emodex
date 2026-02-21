/**
 * GET /api/health/storage — Mastra storage kind (file | file_tmp | turso)
 */
jest.mock('@/mastra', () => ({
  mastraStorageKind: 'file',
}));

import { GET } from '@/app/api/health/storage/route';

describe('GET /api/health/storage', () => {
  it('returns mastraStorage and tursoConfigured from mastraStorageKind', async () => {
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('mastraStorage', 'file');
    expect(body).toHaveProperty('tursoConfigured', false);
  });
});
