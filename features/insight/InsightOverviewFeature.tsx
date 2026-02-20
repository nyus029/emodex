'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface DayOverDayChange {
  value: number;
  percentage: number;
}

interface InsightAlbum {
  id: string;
  name: string;
  albumType: string;
  groupName: string | null;
  emoValue: number;
  dayOverDayChange: DayOverDayChange;
}

interface InsightOverviewData {
  totalEmoValue: number;
  totalDayOverDayChange: DayOverDayChange;
  albums: InsightAlbum[];
}

export default function InsightOverviewFeature() {
  const [data, setData] = useState<InsightOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/albums/insight');
      if (!res.ok) throw new Error('Failed to load insight');
      const json = (await res.json()) as InsightOverviewData;
      setData(json);
    } catch {
      setError('インサイトデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const totalChange = data?.totalDayOverDayChange;
  const isTotalPositive = (totalChange?.value ?? 0) >= 0;

  return (
    <div className="mx-auto grid max-w-3xl gap-6 p-4 pb-24">
      {/* Header: Total Emo Value */}
      <section className="grid gap-1">
        <p className="text-sm text-zinc-500">総エモ価</p>
        {loading ? (
          <>
            <div className="h-10 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          </>
        ) : (
          <>
            <p className="text-3xl font-bold">
              {Math.round(data?.totalEmoValue ?? 0).toLocaleString()}{' '}
              <span className="text-base font-normal text-zinc-500">emo</span>
            </p>
            <p
              className={`text-sm ${isTotalPositive ? 'text-green-600' : 'text-red-600'}`}
            >
              {isTotalPositive ? '+' : ''}
              {(totalChange?.value ?? 0).toLocaleString()} emo (
              {isTotalPositive ? '+' : ''}
              {totalChange?.percentage ?? 0}%)
            </p>
          </>
        )}
      </section>

      {/* Album List */}
      <section className="grid gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700"
            />
          ))
        ) : data && data.albums.length > 0 ? (
          data.albums.map((album) => {
            const isPositive = album.dayOverDayChange.value >= 0;
            return (
              <Link
                key={album.id}
                href={`/invests/${album.id}/insight`}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <div className="grid gap-0.5">
                  <span className="font-medium">{album.name}</span>
                  <span className="text-xs text-zinc-500">
                    {album.albumType === 'SHARED'
                      ? (album.groupName ?? 'SHARED')
                      : 'PRIVATE'}
                  </span>
                </div>
                <div className="grid gap-0.5 text-right">
                  <span className="font-medium">
                    {Math.round(album.emoValue).toLocaleString()}{' '}
                    <span className="text-xs font-normal text-zinc-500">
                      emo
                    </span>
                  </span>
                  <span
                    className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {isPositive ? '+' : ''}
                    {album.dayOverDayChange.percentage}%
                  </span>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">
            アルバムがありません。INVESTからアルバムを作成してください。
          </div>
        )}
      </section>
    </div>
  );
}
