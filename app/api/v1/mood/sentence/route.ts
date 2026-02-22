import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  parseBody,
  jsonSuccess,
  jsonError,
} from '@/lib/api-utils';
import { getCooldownStatus } from '@/lib/mood-cooldown';

const bodySchema = z.object({
  words: z
    .array(z.string())
    .min(1, 'At least one word is required')
    .describe('心象に含めたい単語の配列'),
  includeRecommendation: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth.session;

  const latest = await prisma.moodRecord.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  const cooldown = getCooldownStatus(latest?.createdAt ?? null);
  if (cooldown.isCooldown) {
    const mins = Math.floor(cooldown.remainingSeconds / 60);
    const secs = cooldown.remainingSeconds % 60;
    return jsonError(
      `心象の記録は1時間に1回までです。あと${mins}分${secs}秒お待ちください。`,
      429,
    );
  }

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = parseBody(rawBody, bodySchema);
  if (parsed.error) return parsed.error;

  const { words, includeRecommendation } = parsed.data;
  const wordList = words.filter(
    (w) => typeof w === 'string' && (w as string).trim().length > 0,
  );
  if (wordList.length === 0) {
    return jsonError('At least one non-empty word is required', 400);
  }

  let moodSentence: string;
  let recommendationText: string | null = null;

  try {
    const { moodSentenceFromWordsTool } =
      await import('@/mastra/tools/mood-sentence-from-words-tool');
    if (!moodSentenceFromWordsTool.execute) {
      return jsonError('Mood sentence tool is not available', 500);
    }
    const moodResult = await moodSentenceFromWordsTool.execute(
      { words: wordList },
      {},
    );
    moodSentence =
      'sentence' in moodResult && typeof moodResult.sentence === 'string'
        ? moodResult.sentence
        : '心象を表す文章を生成できませんでした。';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Mood sentence generation error:', message);
    return jsonError('Failed to generate mood sentence', 500);
  }

  if (includeRecommendation && moodSentence) {
    try {
      const { emotionRecommendationTool } =
        await import('@/mastra/tools/emotion-recommendation-tool');
      if (emotionRecommendationTool.execute) {
        const recResult = (await emotionRecommendationTool.execute(
          { sentence: moodSentence },
          {},
        )) as unknown as { recommendationText?: string };
        recommendationText =
          typeof recResult.recommendationText === 'string' &&
          recResult.recommendationText.trim().length > 0
            ? recResult.recommendationText.trim()
            : null;
      }
    } catch {
      // optional: leave recommendationText null
    }
  }

  try {
    const record = await prisma.moodRecord.create({
      data: {
        userId,
        sentence: moodSentence,
        words: wordList,
        recommendationText,
      },
    });

    return jsonSuccess({
      sentence: moodSentence,
      ...(recommendationText != null && { recommendationText }),
      recordId: record.id,
    });
  } catch (err) {
    console.error('Failed to save MoodRecord:', err);
    return jsonError('Failed to save mood record', 500);
  }
}
