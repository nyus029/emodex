import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { mastra } from '@/mastra';

const RECOMMENDATION_PROMPT = (sentence: string) =>
  `以下の文章は、あるユーザーの心象（考え・気持ち）を表したものです。
この心象を受け止めた上で、ユーザーがこれから持つとよい感情や姿勢を、柔らかく励ますような1文で提案してください。

心象: ${sentence}

要件:
- 説教臭くせず、ユーザーの心理に寄り添うトーンにしてください
- 1文だけ出力し、句点で終えてください。説明や余計な文言は付けないでください`;

/**
 * 心象文から励ましの1文を生成するツール。
 */
export const emotionRecommendationTool = createTool({
  id: 'emotion-recommendation',
  description:
    'ユーザーの心象を表す文章を受け取り、心象に基づいた励ましの1文を生成します。',
  inputSchema: z.object({
    sentence: z.string().describe('ユーザーの心象を表す文章'),
  }),
  outputSchema: z.object({
    recommendationText: z.string().describe('心象に基づいた励ましの1文'),
  }),
  execute: async ({ sentence }) => {
    const trimmed = (sentence ?? '').trim();
    if (!trimmed) {
      return { recommendationText: '' };
    }

    if (!process.env.OPENAI_API_KEY) {
      return { recommendationText: '' };
    }

    const agent = mastra.getAgent('chatAgent');
    if (!agent) {
      return { recommendationText: '' };
    }

    try {
      const stream = await agent.stream([
        { role: 'user', content: RECOMMENDATION_PROMPT(trimmed) },
      ]);
      const raw = await stream.text;
      if (stream.error) {
        return { recommendationText: '' };
      }
      const recommendationText = (raw ?? '').trim();
      return { recommendationText: recommendationText || '' };
    } catch {
      return { recommendationText: '' };
    }
  },
});
