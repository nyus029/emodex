/**
 * POST /api/chat/stream — chat streaming with dynamic mastra import
 */
const mockGetAgent = jest.fn();
jest.mock('@/mastra', () => ({
  mastra: {
    getAgent: mockGetAgent,
  },
}));

import { POST } from '@/app/api/chat/stream/route';

const env = process.env;

describe('POST /api/chat/stream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...env };
  });

  afterAll(() => {
    process.env = env;
  });

  it('returns 400 when message is missing', async () => {
    const res = await POST(
      new Request('http://localhost/api/chat/stream', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('message is required');
  });

  it('returns mock stream when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    const res = await POST(
      new Request('http://localhost/api/chat/stream', {
        method: 'POST',
        body: JSON.stringify({ message: 'hello' }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mockGetAgent).not.toHaveBeenCalled();
    const text = await res.text();
    expect(text).toMatch(/モック|OPENAI_API_KEY|hello/);
  });

  it('returns 500 when chatAgent is not configured', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    mockGetAgent.mockReturnValue(null);

    const res = await POST(
      new Request('http://localhost/api/chat/stream', {
        method: 'POST',
        body: JSON.stringify({ message: 'hello' }),
      }),
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/chatAgent|not configured/);
  });

  it('returns 200 with stream when agent returns stream', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const asyncIterable = (async function* () {
      yield 'こんにちは';
    })();
    mockGetAgent.mockReturnValue({
      stream: () =>
        Promise.resolve({
          textStream: asyncIterable,
        }),
    });

    const res = await POST(
      new Request('http://localhost/api/chat/stream', {
        method: 'POST',
        body: JSON.stringify({ message: 'hello' }),
      }),
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('こんにちは');
  });
});
