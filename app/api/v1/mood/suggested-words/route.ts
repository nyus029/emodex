import { getAccessibleAlbumList } from '@/lib/album-access';
import { requireAuth, jsonSuccess, jsonError } from '@/lib/api-utils';
import { EMOTION_WORDS } from '@/components/sentence/EmotionWordsMock';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId, userEmail } = auth.session;

  const albums = await getAccessibleAlbumList(userId, userEmail ?? '');

  const allTags = [
    ...new Set(albums.flatMap((a) => a.createdTags).filter(Boolean)),
  ];

  if (allTags.length === 0) {
    return jsonSuccess({ suggestedWords: [...EMOTION_WORDS] });
  }

  try {
    const { suggestWordsFromTagsTool } =
      await import('@/mastra/tools/suggest-words-from-tags-tool');
    if (!suggestWordsFromTagsTool.execute) {
      return jsonSuccess({ suggestedWords: [...EMOTION_WORDS] });
    }

    const result = await suggestWordsFromTagsTool.execute(
      { tags: allTags },
      {},
    );
    if (
      result &&
      'suggestedWords' in result &&
      Array.isArray(result.suggestedWords) &&
      result.suggestedWords.length > 0
    ) {
      return jsonSuccess({ suggestedWords: result.suggestedWords });
    }

    return jsonSuccess({ suggestedWords: [...EMOTION_WORDS] });
  } catch (err) {
    console.error('Suggest words from tags error:', err);
    return jsonError('単語の推薦に失敗しました。', 500);
  }
}
