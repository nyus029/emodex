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
      <div className="min-h-screen bg-background-light p-5">
        <div className="mx-auto max-w-md rounded-xl bg-white px-4 py-3 shadow-card">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const totalChange = data?.totalDayOverDayChange;
  const isTotalPositive = (totalChange?.value ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-background-light p-5">
      <div className="mx-auto max-w-md space-y-4 pb-24">
        {/* Total Emo Value Card */}
        <div className="rounded-xl bg-white px-5 py-4 shadow-card">
          <p className="text-[13px] text-gray-500">総エモ価</p>
          {loading ? (
            <>
              <div className="mt-2 h-8 w-36 animate-pulse rounded-lg bg-gray-100" />
              <div className="mt-1 h-4 w-28 animate-pulse rounded-lg bg-gray-100" />
            </>
          ) : (
            <>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {Math.round(data?.totalEmoValue ?? 0).toLocaleString()}{' '}
                <span className="text-sm font-normal text-gray-500">emo</span>
              </p>
              <p
                className={`mt-0.5 text-[13px] font-medium ${isTotalPositive ? 'text-green' : 'text-red-500'}`}
              >
                {isTotalPositive ? '+' : ''}
                {(totalChange?.value ?? 0).toLocaleString()} emo (
                {isTotalPositive ? '+' : ''}
                {totalChange?.percentage ?? 0}%)
              </p>
            </>
          )}
        </div>

        {/* Album List */}
        <section className="space-y-3">
          <h2 className="px-1 text-sm font-semibold text-gray-600">アルバム</h2>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse rounded-xl bg-white shadow-card"
              />
            ))
          ) : data && data.albums.length > 0 ? (
            data.albums.map((album) => {
              const isPositive = album.dayOverDayChange.value >= 0;
              return (
                <Link
                  key={album.id}
                  href={`/invests/${album.id}/insight`}
                  className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-card transition-colors active:bg-gray-50"
                >
                  <div className="grid gap-0.5">
                    <span className="text-[15px] font-medium text-gray-900">
                      {album.name}
                    </span>
                    <span className="text-[13px] text-gray-500">
                      {album.albumType === 'SHARED'
                        ? (album.groupName ?? 'SHARED')
                        : 'PRIVATE'}
                    </span>
                  </div>
                  <div className="grid gap-0.5 text-right">
                    <span className="text-[15px] font-medium text-gray-900">
                      {Math.round(album.emoValue).toLocaleString()}{' '}
                      <span className="text-[13px] font-normal text-gray-500">
                        emo
                      </span>
                    </span>
                    <span
                      className={`text-[13px] font-medium ${isPositive ? 'text-green' : 'text-red-500'}`}
                    >
                      {isPositive ? '+' : ''}
                      {album.dayOverDayChange.percentage}%
                    </span>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-card">
              アルバムがありません。INVESTからアルバムを作成してください。
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
