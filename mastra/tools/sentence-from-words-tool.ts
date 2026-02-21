import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { mastra } from '@/mastra';
import { SENTENCE_FROM_WORDS_PROMPT } from '@/mastra/prompts/mood-prompts';

const NO_KEY_MESSAGE =
  'OPENAI_API_KEYを設定すると、Codexモデルで選択した単語から生成された文章がここに表示されます。';

/**
 * 単語の配列から1文を生成するツール。Codex（chatAgent）を使用する。
 * APIキー未設定・認証エラー時は案内文またはエラーメッセージを返す。
 */
export const sentenceFromWordsTool = createTool({
  id: 'generate-sentence-from-words',
  description:
    '単語の配列を受け取って、意味の通った文章を生成します。Codexモデルを使用して自然な文章を生成します。',
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
    const wordList = words.filter(
      (w) => typeof w === 'string' && w.trim().length > 0,
    );
    const safeWords = wordList.length > 0 ? wordList : words;
    const resultBase = {
      wordCount: safeWords.length,
      usedWords: safeWords,
    };

    if (!process.env.OPENAI_API_KEY) {
      return { ...resultBase, sentence: NO_KEY_MESSAGE };
    }

    const agent = mastra.getAgent('chatAgent');
    if (!agent) {
      return {
        ...resultBase,
        sentence: 'chatAgentが設定されていません。',
      };
    }

    try {
      const stream = await agent.stream([
        { role: 'user', content: SENTENCE_FROM_WORDS_PROMPT(safeWords) },
      ]);
      const raw = await stream.text;
      if (stream.error) {
        const msg =
          typeof stream.error === 'string'
            ? stream.error
            : stream.error instanceof Error
              ? stream.error.message
              : ((stream.error as { message?: string })?.message ?? '');
        if (
          (stream.error as { status?: number })?.status === 401 ||
          msg.includes('api-key') ||
          msg.includes('API key')
        ) {
          return {
            ...resultBase,
            sentence: '認証エラー: OPENAI_API_KEYを確認してください。',
          };
        }
        throw stream.error instanceof Error
          ? stream.error
          : new Error(String(stream.error));
      }
      const sentence = (raw ?? '').trim();
      return {
        ...resultBase,
        sentence: sentence || '文章を生成できませんでした。',
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (
        (err as { status?: number })?.status === 401 ||
        msg.includes('api-key') ||
        msg.includes('API key')
      ) {
        return {
          ...resultBase,
          sentence: '認証エラー: OPENAI_API_KEYを確認してください。',
        };
      }
      throw err;
    }
  },
});
