import { NextResponse } from 'next/server';

interface AlbumInsightResponse {
  albumBasicInfo: {
    name: string;
    createdAt: string;
    dividend: string;
  };
  emoValueInfo: {
    emoValue: number;
    dayOverDayChange: {
      value: number;
      percentage: number;
    };
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<AlbumInsightResponse>> {
  const { id } = await params;

  // モックデータ
  const mockResponse: AlbumInsightResponse = {
    albumBasicInfo: {
      name: `Album ${id}`,
      createdAt: '2026-02-01',
      dividend: '¥1,250',
    },
    emoValueInfo: {
      emoValue: 8500,
      dayOverDayChange: {
        value: 125,
        percentage: 1.49,
      },
    },
  };

  return NextResponse.json(mockResponse, { status: 200 });
}
