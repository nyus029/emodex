import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { mastra } from '@/mastra';

type AlbumInput = {
  id: string;
  name: string;
  createdTags?: string[];
  emoValue?: number;
};

/**
 * 応答テキストから JSON 文字列を抽出する。コードブロック（```json ... ``` / ``` ... ```）があればその中身を、なければ最初の {...} を返す。
 */
function extractJsonFromResponse(text: string): string | null {
  const trimmed = text.trim();
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    return inner.length > 0 ? inner : null;
  }
  const braceMatch = trimmed.match(/\{[\s\S]*\}/);
  return braceMatch ? braceMatch[0] : null;
}

/**
 * 心象文を簡易トークン化（空白・句読点で分割、2文字以上のトークンのみ）。
 */
function tokenizeEmotion(sentence: string): string[] {
  return sentence
    .split(/[\s、。・]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}

const FALLBACK_REASON_MATCH =
  '選択した単語・心象とアルバムのタグが一致しています';
const FALLBACK_REASON_DEFAULT = '心象に合わせて選びました';

/**
 * 心象文とアルバムのタグ・名前の一致度 + エモ価でスコア付け。
 * moodSeverity が高いほどエモ価の高いアルバムを優先する。
 * extraKeywords がある場合、トークンにマージしてスコア計算に使う。
 */
function suggestByTagScore(
  emotionSentence: string,
  albums: AlbumInput[],
  max: number = 5,
  extraKeywords?: string[],
  moodSeverity?: number,
): Array<{ id: string; reason?: string }> {
  const fromSentence = tokenizeEmotion(emotionSentence);
  const extra = (extraKeywords ?? [])
    .filter((s) => s.length >= 2)
    .map((s) => s.trim());
  const tokens = [...new Set([...fromSentence, ...extra])].filter(
    (s) => s.length >= 2,
  );

  if (tokens.length === 0 && !moodSeverity) {
    return albums.slice(0, 3).map((a) => ({
      id: a.id,
      reason: FALLBACK_REASON_DEFAULT,
    }));
  }

  const severity = moodSeverity ?? 0.5;
  const maxEmo = Math.max(...albums.map((a) => a.emoValue ?? 0), 1);

  const scored = albums.map((album) => {
    let tagScore = 0;
    const name = album.name ?? '';
    const tags = album.createdTags ?? [];
    for (const token of tokens) {
      if (name.includes(token)) tagScore += 2;
      if (tags.some((t) => t.includes(token))) tagScore += 1;
    }

    const emoNormalized = (album.emoValue ?? 0) / maxEmo;
    const emoWeight = severity * 3;
    const score = tagScore + emoNormalized * emoWeight;

    return { album, score, tagScore };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, max);
  const hasPositive = top.some((t) => t.score > 0);
  const take = hasPositive
    ? top
    : albums.slice(0, 3).map((album) => ({ album, score: 0, tagScore: 0 }));

  return take.map(({ album, score, tagScore }) => ({
    id: album.id,
    reason:
      tagScore > 0
        ? FALLBACK_REASON_MATCH
        : score > 0
          ? 'エモ価が高く、今の気持ちに響くアルバムです'
          : FALLBACK_REASON_DEFAULT,
  }));
}

function buildSuggestPrompt(
  emotionSentence: string,
  albumsJson: string,
  options?: {
    words?: string[];
    recommendationText?: string;
    moodSeverity?: number;
  },
): string {
  const lines: string[] = [
    '以下の「ユーザーの心象」と「アルバム一覧」を読んで、この心象・感情に合うアルバムを選んでください。',
    'アルバム名やタグ、エモ価（感情的価値）を手がかりに、ユーザーが今の気持ちで見るとよいアルバムを最大5件まで選び、短い理由（日本語で1行）を付けてください。',
  ];
  if (options?.moodSeverity !== undefined) {
    const severityLabel =
      options.moodSeverity >= 0.7
        ? '深刻（エモ価の高いアルバムを優先してください）'
        : options.moodSeverity >= 0.4
          ? '普通'
          : '軽め';
    lines.push(`気分の深刻度: ${severityLabel}`);
  }
  lines.push('', '【ユーザーの心象】', emotionSentence, '');
  if (
    options?.words &&
    Array.isArray(options.words) &&
    options.words.some((w) => typeof w === 'string' && w.trim().length > 0)
  ) {
    const wordsLine = options.words
      .filter((w) => typeof w === 'string' && (w as string).trim().length > 0)
      .map((w) => (w as string).trim())
      .join(', ');
    lines.push('【選択した単語】', wordsLine, '');
  }
  if (
    options?.recommendationText &&
    typeof options.recommendationText === 'string' &&
    options.recommendationText.trim().length > 0
  ) {
    lines.push('【おすすめの気持ち】', options.recommendationText.trim(), '');
  }
  lines.push(
    '【アルバム一覧】（id, name, createdTags, emoValue）',
    albumsJson,
    '',
    '以下のJSON形式のみを出力してください。説明やマークダウンは不要です。',
    '{"suggested":[{"id":"アルバムのid","reason":"選んだ理由（1行）"}, ...]}',
  );
  return lines.join('\n');
}

export type SuggestedAlbum = {
  id: string;
  name: string;
  reason?: string;
};

/**
 * 心象文とアルバム一覧から、感情に合うアルバムを選び id と理由を返すツール。
 */
export const suggestAlbumsByEmotionTool = createTool({
  id: 'suggest-albums-by-emotion',
  description:
    'ユーザーの心象を表す文章とアルバム一覧を受け取り、感情に合うアルバムを選んで id と短い理由を返します。',
  inputSchema: z.object({
    emotionSentence: z.string().describe('ユーザーの心象を表す文章'),
    albums: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          createdTags: z.array(z.string()).optional(),
          emoValue: z.number().optional().describe('アルバムのエモ価'),
        }),
      )
      .describe('アルバム一覧（id, name, createdTags, emoValue）'),
    words: z
      .array(z.string())
      .optional()
      .describe('ユーザーが選んだ感情単語（任意）'),
    recommendationText: z
      .string()
      .optional()
      .describe('おすすめの気持ち（任意）'),
    moodSeverity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('気分の深刻度 (0.0〜1.0)'),
  }),
  outputSchema: z.object({
    suggested: z.array(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
      }),
    ),
  }),
  execute: async ({
    emotionSentence,
    albums,
    words,
    recommendationText,
    moodSeverity,
  }) => {
    const trimmed = (emotionSentence ?? '').trim();
    if (!trimmed || albums.length === 0) {
      return { suggested: [] };
    }

    const extraKeywords = (words ?? [])
      .filter((w) => typeof w === 'string' && w.trim().length >= 2)
      .map((w) => w.trim());
    const fallback = () =>
      suggestByTagScore(trimmed, albums, 5, extraKeywords, moodSeverity);

    if (!process.env.OPENAI_API_KEY) {
      return { suggested: fallback() };
    }

    const agent = mastra.getAgent('chatAgent');
    if (!agent) {
      return { suggested: fallback() };
    }

    const albumsJson = JSON.stringify(
      albums.map((a) => ({
        id: a.id,
        name: a.name,
        createdTags: a.createdTags ?? [],
        emoValue: a.emoValue ?? 0,
      })),
      null,
      2,
    );

    try {
      const prompt = buildSuggestPrompt(trimmed, albumsJson, {
        words: words ?? undefined,
        recommendationText: recommendationText ?? undefined,
        moodSeverity: moodSeverity ?? undefined,
      });
      const stream = await agent.stream([{ role: 'user', content: prompt }]);
      const raw = await stream.text;
      if (stream.error) {
        return { suggested: fallback() };
      }

      const text = (raw ?? '').trim();
      const jsonStr = extractJsonFromResponse(text);
      if (!jsonStr) {
        return { suggested: fallback() };
      }
      const parsed = JSON.parse(jsonStr) as {
        suggested?: Array<{ id?: string; reason?: string }>;
      };
      const rawSuggested = Array.isArray(parsed?.suggested)
        ? parsed.suggested
            .filter(
              (s): s is { id: string; reason?: string } =>
                typeof s?.id === 'string',
            )
            .map((s) => ({
              id: s.id,
              reason: typeof s.reason === 'string' ? s.reason : undefined,
            }))
        : [];
      const seen = new Set<string>();
      const suggested = rawSuggested.filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });

      return { suggested };
    } catch {
      return { suggested: fallback() };
    }
  },
});
