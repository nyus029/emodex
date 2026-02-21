import { requireAuth, jsonSuccess, jsonError } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth.session;

  try {
    const records = await prisma.moodRecord.findMany({
      where: { userId },
      select: { words: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    if (records.length === 0) {
      return jsonSuccess({ topEmotions: [] });
    }

    const wordCounts = new Map<string, number>();
    const wordDateCounts = new Map<string, Map<string, number>>();

    for (const record of records) {
      const words = record.words as string[];
      const dateStr = record.createdAt.toISOString().slice(0, 10);

      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);

        if (!wordDateCounts.has(word)) {
          wordDateCounts.set(word, new Map());
        }
        const dateCounts = wordDateCounts.get(word)!;
        dateCounts.set(dateStr, (dateCounts.get(dateStr) ?? 0) + 1);
      }
    }

    const topWords = [...wordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topEmotions = topWords.map(([word, totalCount]) => {
      const dateCounts = wordDateCounts.get(word)!;
      const sortedDates = [...dateCounts.keys()].sort();

      let cumulative = 0;
      const data = sortedDates.map((date) => {
        cumulative += dateCounts.get(date)!;
        return { time: date, value: cumulative };
      });

      return { word, totalCount, data };
    });

    return jsonSuccess({ topEmotions });
  } catch (err) {
    console.error('Top emotions error:', err);
    return jsonError('トップエモーションの取得に失敗しました', 500);
  }
}
