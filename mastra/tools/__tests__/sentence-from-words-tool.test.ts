import { sentenceFromWordsTool } from '../sentence-from-words-tool';

describe('sentenceFromWordsTool', () => {
  it('should return correct structure', () => {
    expect(sentenceFromWordsTool.id).toBe('generate-sentence-from-words');
    expect(sentenceFromWordsTool.description).toBeTruthy();
    expect(sentenceFromWordsTool.inputSchema).toBeTruthy();
    expect(sentenceFromWordsTool.outputSchema).toBeTruthy();
  });

  it('should validate input schema', async () => {
    const inputSchema = sentenceFromWordsTool.inputSchema;

    const validInput = { words: ['猫', '走る', '公園'] };
    const result = await inputSchema.parseAsync(validInput);
    expect(result.words).toEqual(['猫', '走る', '公園']);
  });

  it('should reject empty words array', async () => {
    const inputSchema = sentenceFromWordsTool.inputSchema;

    try {
      await inputSchema.parseAsync({ words: [] });
      fail('Should have thrown error');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
