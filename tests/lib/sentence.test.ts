import type { Agent } from '@mastra/core/agent';
import { generateSentenceFromWords } from '@/lib/sentence';

const originalOpenAiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  process.env.OPENAI_API_KEY = originalOpenAiKey;
});

describe('generateSentenceFromWords', () => {
  it('throws when no usable words are provided', async () => {
    await expect(generateSentenceFromWords(['   ', '\n'])).rejects.toThrow(
      'words array',
    );
  });

  it('returns a fallback sentence when no agent is available', async () => {
    process.env.OPENAI_API_KEY = undefined;
    const sentence = await generateSentenceFromWords(['hello', 'world']);

    expect(sentence).toBe('hello world.');
  });

  it('uses the provided agent output when available', async () => {
    const mockGenerate = jest
      .fn()
      .mockResolvedValue({ text: 'AI sentence' } as Awaited<
        ReturnType<Agent['generate']>
      >);
    const mockAgent = { generate: mockGenerate } as unknown as Agent;

    const sentence = await generateSentenceFromWords(['red', 'apple'], {
      agent: mockAgent,
    });

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    const [messages] = mockGenerate.mock.calls[0];
    expect(Array.isArray(messages)).toBe(true);
    expect(messages[0].content).toContain('red');
    expect(messages[0].content).toContain('apple');
    expect(sentence).toBe('AI sentence');
  });

  it('falls back when the agent fails', async () => {
    const mockAgent = {
      generate: jest.fn().mockRejectedValue(new Error('fail')),
    } as unknown as Agent;

    const sentence = await generateSentenceFromWords(['fallback', 'case'], {
      agent: mockAgent,
    });

    expect(sentence).toBe('fallback case.');
  });
});
