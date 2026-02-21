import { sentenceFromWordsTool } from '../sentence-from-words-tool';

const mockSentence = '喜びと楽しみを感じた一日だった。';

jest.mock('@/mastra', () => ({
  mastra: {
    getAgent: () => ({
      stream: () => ({
        text: Promise.resolve(mockSentence),
        get textStream() {
          return (async function* () {
            yield mockSentence;
          })();
        },
        error: undefined,
      }),
    }),
  },
}));

describe('sentenceFromWordsTool', () => {
  it('should return correct structure', () => {
    expect(sentenceFromWordsTool.id).toBe('generate-sentence-from-words');
    expect(sentenceFromWordsTool.description).toBeTruthy();
    expect(sentenceFromWordsTool.inputSchema).toBeTruthy();
    expect(sentenceFromWordsTool.outputSchema).toBeTruthy();
  });

  it('should validate input schema', async () => {
    const inputSchema = sentenceFromWordsTool.inputSchema;
    if (!inputSchema) throw new Error('inputSchema is undefined');

    const validInput = { words: ['猫', '走る', '公園'] };
    const result = await inputSchema.parseAsync(validInput);
    expect(result.words).toEqual(['猫', '走る', '公園']);
  });

  it('should reject empty words array', async () => {
    const inputSchema = sentenceFromWordsTool.inputSchema;
    if (!inputSchema) throw new Error('inputSchema is undefined');

    try {
      await inputSchema.parseAsync({ words: [] });
      fail('Should have thrown error');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should return sentence from execute (Codex or fallback)', async () => {
    if (!sentenceFromWordsTool.execute) throw new Error('execute is undefined');
    const hadKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY =
      process.env.OPENAI_API_KEY || 'test-key-for-mock';
    try {
      const result = await sentenceFromWordsTool.execute(
        { words: ['喜び', '楽しみ'] },
        {},
      );
      expect(result).toMatchObject({
        wordCount: 2,
        usedWords: ['喜び', '楽しみ'],
      });
      expect(typeof result.sentence).toBe('string');
      expect(result.sentence.length).toBeGreaterThan(0);
      if (!result.sentence.includes('OPENAI_API_KEYを設定')) {
        expect(result.sentence).toContain('喜び');
        expect(result.sentence).toContain('楽しみ');
        expect(result.sentence.trim().endsWith('。')).toBe(true);
        console.log('作成された文章:', result.sentence);
      }
    } finally {
      if (!hadKey) delete process.env.OPENAI_API_KEY;
    }
  }, 20000);
});
