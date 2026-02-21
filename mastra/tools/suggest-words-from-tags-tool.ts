import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { mastra } from '@/mastra';
import { EMOTION_WORDS } from '@/components/sentence/EmotionWordsMock';

const SUGGEST_PROMPT = (tags: string[]) =>
  `以下はユーザーの写真アルバムに付けられたタグ一覧です。
これらのタグから連想される感情や心理状態を表す日本語の単語を10〜15個提案してください。

タグ: ${tags.join(', ')}

要件:
- 各タグが喚起しうる感情・気持ち・心理状態を表す単語にしてください
- ポジティブ・ネガティブ両方を含めてバランスよく提案してください
- 1行に1単語ずつ、単語のみを出力してください
- 余計な説明や番号は付けないでください`;

/**
 * アルバムのタグ一覧から感情・心象に関連する単語を推薦するツール。
 */
export const suggestWordsFromTagsTool = createTool({
  id: 'suggest-words-from-tags',
  description:
    'アルバムのタグ一覧から、関連する感情・心象の単語を10〜15個推薦します。',
  inputSchema: z.object({
    tags: z.array(z.string()).describe('アルバムに付けられたタグの配列'),
  }),
  outputSchema: z.object({
    suggestedWords: z
      .array(z.string())
      .describe('タグから連想された感情・心象の単語'),
  }),
  execute: async ({ tags }) => {
    const fallback = { suggestedWords: [...EMOTION_WORDS] };

    const validTags = tags.filter(
      (t) => typeof t === 'string' && t.trim().length > 0,
    );
    if (validTags.length === 0) {
      return fallback;
    }

    if (!process.env.OPENAI_API_KEY) {
      return fallback;
    }

    const agent = mastra.getAgent('chatAgent');
    if (!agent) {
      return fallback;
    }

    try {
      const stream = await agent.stream([
        { role: 'user', content: SUGGEST_PROMPT(validTags) },
      ]);
      const raw = await stream.text;
      if (stream.error) {
        return fallback;
      }

      const words = (raw ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && line.length <= 20);

      if (words.length === 0) {
        return fallback;
      }

      return { suggestedWords: words };
    } catch {
      return fallback;
    }
  },
});
