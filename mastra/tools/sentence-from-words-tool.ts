import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Tool that generates a meaningful sentence from an array of words using Claude.
 * Takes word array as input and returns a natural Japanese sentence.
 */
export const sentenceFromWordsTool = createTool({
  id: 'generate-sentence-from-words',
  description:
    '単語の配列を受け取って、意味の通った文章を生成します。LLMを使用して自然な文章を生成します。',
  inputSchema: z.object({
    words: z
      .array(z.string())
      .nonempty('少なくとも1つの単語が必要です')
      .describe('文章に含める単語の配列'),
  }),
  outputSchema: z.object({
    sentence: z.string().describe('生成された意味のある文章'),
    wordCount: z.number().describe('入力された単語の数'),
    usedWords: z.array(z.string()).describe('実際に使用された単語'),
  }),
  execute: async ({ words }) => {
    const client = new Anthropic();

    const prompt = `以下の単語を全て含む、意味の通った日本語の文章を1文だけ作成してください。
単語: ${words.join(', ')}

要件:
- すべての単語を含めてください
- 自然で意味のある文章にしてください
- 1文だけ生成してください
- 句点で終わってください

文章のみを出力してください。`;

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const sentence =
      message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    return {
      sentence,
      wordCount: words.length,
      usedWords: words,
    };
  },
});
