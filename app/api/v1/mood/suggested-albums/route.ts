import { getAccessibleAlbumList } from '@/lib/album-access';
import { toTagArray } from '@/lib/albums';
import { requireAuth, jsonSuccess, jsonError, roundEmo } from '@/lib/api-utils';
import { calculateAlbumEmo, type StorageParams } from '@/lib/emo-value';
import { calculateMoodSeverity } from '@/lib/mood-scoring';
import { BOOST_MULTIPLIER } from '@/lib/emo-boost';
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

  const albumIds = albums.map((a) => a.id);
  const albumStorages = await prisma.album.findMany({
    where: { id: { in: albumIds } },
    select: {
      id: true,
      createdTags: true,
      photoStorages: {
        select: {
          photoCount: true,
          baseEmoPerPhoto: true,
          compoundStartDate: true,
          isCompoundActive: true,
        },
      },
    },
  });

  const albumEmoMap = new Map<string, number>();
  for (const album of albumStorages) {
    const storages: StorageParams[] = album.photoStorages;
    albumEmoMap.set(album.id, calculateAlbumEmo(storages));
  }

  const words = toTagArray(latest.words);
  const moodSeverity = calculateMoodSeverity(words);

  let suggested: Array<{ id: string; reason?: string }>;
  try {
    const { suggestAlbumsByEmotionTool } =
      await import('@/mastra/tools/suggest-albums-by-emotion-tool');
    if (!suggestAlbumsByEmotionTool.execute) {
      suggested = albums.slice(0, 3).map((a) => ({ id: a.id }));
    } else {
      const result = await suggestAlbumsByEmotionTool.execute(
        {
          emotionSentence: latest.sentence,
          albums: albums.map((a) => ({
            id: a.id,
            name: a.name,
            createdTags: a.createdTags,
            emoValue: roundEmo(albumEmoMap.get(a.id) ?? 0),
          })),
          words: words.length > 0 ? words : undefined,
          recommendationText: latest.recommendationText ?? undefined,
          moodSeverity,
        },
        {},
      );
      suggested =
        result && 'suggested' in result && Array.isArray(result.suggested)
          ? result.suggested
          : [];
    }
  } catch (err) {
    console.error('Suggest albums by emotion error:', err);
    suggested = albums.slice(0, 3).map((a) => ({ id: a.id }));
  }

  const albumMap = new Map(albums.map((a) => [a.id, a]));
  const albumTagsMap = new Map(
    albumStorages.map((a) => [a.id, toTagArray(a.createdTags)]),
  );

  const suggestedAlbumIds = suggested
    .filter((s) => albumMap.has(s.id))
    .map((s) => s.id);

  const boostPercentage = roundEmo(BOOST_MULTIPLIER * 100);

  const suggestedAlbums = suggested
    .filter((s) => albumMap.has(s.id))
    .map((s) => {
      const album = albumMap.get(s.id)!;
      const emoValue = roundEmo(albumEmoMap.get(s.id) ?? 0);
      const tags = albumTagsMap.get(s.id) ?? [];
      const tagWord =
        tags.length > 0
          ? tags[Math.floor(Math.random() * tags.length)]
          : undefined;

      return {
        id: album.id,
        name: album.name,
        reason: s.reason,
        emoValue,
        emoBoost: boostPercentage,
        tagWord,
      };
    });

  if (suggestedAlbumIds.length > 0) {
    await prisma.moodRecord.update({
      where: { id: latest.id },
      data: { boostedAlbumIds: suggestedAlbumIds },
    });
  }

  return jsonSuccess({
    suggestedAlbums,
    emotionSentence: latest.sentence,
    moodSeverity: roundEmo(moodSeverity),
    ...(suggestedAlbums.length === 0 && albums.length > 0
      ? { message: 'おすすめのアルバムを選べませんでした。' }
      : {}),
  });
}
