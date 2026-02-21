import { getAccessibleAlbumList } from '@/lib/album-access';
import { toTagArray } from '@/lib/albums';
import { requireAuth, jsonSuccess, jsonError } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId, userEmail } = auth.session;

  const latest = await prisma.moodRecord.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!latest) {
    return jsonError(
      '心象の記録がありません。先に単語から心象文を生成して保存してください。',
      404,
    );
  }

  const albums = await getAccessibleAlbumList(userId, userEmail ?? '');
  if (albums.length === 0) {
    return jsonSuccess({
      suggestedAlbums: [],
      emotionSentence: latest.sentence,
      message: 'アクセス可能なアルバムがありません。',
    });
  }

  let suggested: Array<{ id: string; reason?: string }>;
  try {
    const { suggestAlbumsByEmotionTool } =
      await import('@/mastra/tools/suggest-albums-by-emotion-tool');
    if (!suggestAlbumsByEmotionTool.execute) {
      suggested = albums.slice(0, 3).map((a) => ({ id: a.id }));
    } else {
      const words = toTagArray(latest.words);
      const result = await suggestAlbumsByEmotionTool.execute(
        {
          emotionSentence: latest.sentence,
          albums: albums.map((a) => ({
            id: a.id,
            name: a.name,
            createdTags: a.createdTags,
          })),
          words: words.length > 0 ? words : undefined,
          recommendationText: latest.recommendationText ?? undefined,
        },
        {},
      );
      suggested = result.suggested ?? [];
    }
  } catch (err) {
    console.error('Suggest albums by emotion error:', err);
    suggested = albums.slice(0, 3).map((a) => ({ id: a.id }));
  }

  const albumMap = new Map(albums.map((a) => [a.id, a]));
  const suggestedAlbums = suggested
    .filter((s) => albumMap.has(s.id))
    .map((s) => {
      const album = albumMap.get(s.id)!;
      return {
        id: album.id,
        name: album.name,
        reason: s.reason,
      };
    });

  return jsonSuccess({
    suggestedAlbums,
    emotionSentence: latest.sentence,
    ...(suggestedAlbums.length === 0 && albums.length > 0
      ? { message: 'おすすめのアルバムを選べませんでした。' }
      : {}),
  });
}
