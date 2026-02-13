import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const mockAlbum = {
    id,
    albumBasicInfo: {
      albumName: '思い出アルバム',
      createdAt: '2026-02-13T00:00:00.000Z',
      plannedDividend: '2026-03-31',
      createdTags: ['家族', '旅行', 'イベント'],
      requiredAtAlbumCreation: true,
    },
    updateNotification: {
      addedFolderHistory: [
        {
          folderName: '2026_01_京都旅行',
          addedAt: '2026-01-15T09:30:00.000Z',
        },
        {
          folderName: '2026_02_誕生日会',
          addedAt: '2026-02-10T14:20:00.000Z',
        },
      ],
    },
    dividendNotification: {
      recordedAtTransaction: true,
      dividendDates: ['2025-12-31', '2026-01-31', '2026-02-12'],
    },
  };

  return NextResponse.json(mockAlbum, { status: 200 });
}
