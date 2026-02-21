/**
 * POST /api/v1/sentences/stream — sentence streaming with dynamic mastra import
 */
const mockGetAgent = jest.fn();
jest.mock('@/mastra', () => ({
  mastra: {
    getAgent: mockGetAgent,
  },
}));

import { POST } from '@/app/api/v1/sentences/stream/route';

const env = process.env;

describe('POST /api/v1/sentences/stream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...env, OPENAI_API_KEY: 'sk-test' };
  });

  afterAll(() => {
    process.env = env;
  });

  it('returns 400 when body is invalid', async () => {
    const res = await POST(
      new Request('http://localhost/api/v1/sentences/stream', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 when words array is empty after trim', async () => {
    const res = await POST(
      new Request('http://localhost/api/v1/sentences/stream', {
        method: 'POST',
        body: JSON.stringify({ words: ['  ', ''] }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 503 when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    const res = await POST(
      new Request('http://localhost/api/v1/sentences/stream', {
        method: 'POST',
        body: JSON.stringify({ words: ['喜び'] }),
      }),
    );
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toMatch(/OPENAI_API_KEY/);
  });

  it('returns 500 when chatAgent is not configured', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    mockGetAgent.mockReturnValue(null);

    const res = await POST(
      new Request('http://localhost/api/v1/sentences/stream', {
        method: 'POST',
        body: JSON.stringify({ words: ['喜び'] }),
      }),
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/chatAgent|not configured/);
  });

  it('returns 200 with stream when agent returns stream', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const asyncIterable = (async function* () {
      yield '生成';
      yield 'された';
      yield '文。';
    })();
    mockGetAgent.mockReturnValue({
      stream: () =>
        Promise.resolve({
          textStream: asyncIterable,
        }),
    });

    const res = await POST(
      new Request('http://localhost/api/v1/sentences/stream', {
        method: 'POST',
        body: JSON.stringify({ words: ['喜び'] }),
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(/text\/plain/);
    const text = await res.text();
    expect(text).toBe('生成された文。');
  });
});
