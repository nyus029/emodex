import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { mastra } from '@/mastra';

const MOOD_PROMPT_TEMPLATE = (wordList: string[]) =>
  `以下の単語を全て含む、ユーザーの考え・心象（気持ちや心理状態）を表す日本語の文章を1文だけ作成してください。
「ユーザーはこう考えている」「こういう心象です」という形で、その人の内面が伝わるように書いてください。

単語: ${wordList.join(', ')}

要件:
- すべての単語を含めてください
- 自然で意味のある、心象が伝わる1文にしてください
- 1文だけ生成し、句点で終わってください
- 文章のみを出力し、説明や余計な文言は付けないでください`;

const NO_KEY_MESSAGE =
  'OPENAI_API_KEYを設定すると、選択した単語から心象を表す文章が生成されます。';

/**
 * 単語の配列から「心象」を表す1文を生成するツール。chatAgent を使用する。
 */
export const moodSentenceFromWordsTool = createTool({
  id: 'generate-mood-sentence-from-words',
  description: '単語の配列から、ユーザーの考え・心象を表す1文を生成します。',
  inputSchema: z.object({
    words: z
      .array(z.string())
      .nonempty('少なくとも1つの単語が必要です')
      .describe('心象に含めたい単語の配列'),
  }),
  outputSchema: z.object({
    sentence: z.string().describe('生成された心象を表す文章'),
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
        { role: 'user', content: MOOD_PROMPT_TEMPLATE(safeWords) },
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
        sentence: sentence || '心象を表す文章を生成できませんでした。',
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
