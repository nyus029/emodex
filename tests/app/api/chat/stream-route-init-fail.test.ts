/**
 * POST /api/chat/stream — returns 500 when Mastra init (dynamic import) fails
 */
jest.mock('@/mastra', () => {
  throw new Error('LibSQL init failed');
});

import { POST } from '@/app/api/chat/stream/route';

const env = process.env;

describe('POST /api/chat/stream (Mastra init failure)', () => {
  beforeEach(() => {
    process.env = { ...env, OPENAI_API_KEY: 'sk-test' };
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = env;
  });

  it('returns 500 with message when Mastra storage fails to initialize', async () => {
    const res = await POST(
      new Request('http://localhost/api/chat/stream', {
        method: 'POST',
        body: JSON.stringify({ message: 'hello' }),
      }),
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Mastra storage failed to initialize.');
    expect(data.details).toMatch(/LibSQL init failed/);
  });
});
