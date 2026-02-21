'use client';

import { useCallback, useEffect, useState } from 'react';
import PendingDividendItem from '@/components/dividend/PendingDividendItem';
import CompletedDividendItem from '@/components/dividend/CompletedDividendItem';

interface PendingItem {
  albumId: string;
  albumName: string;
  plannedDividend: string;
  photoStorageId: string;
  photoStorageName: string;
  photoCount: number;
  emoValue: number;
  tags: string[];
}

interface CompletedItem {
  dividendEventId: string;
  albumId: string;
  albumName: string;
  photoStorageId: string;
  photoStorageName: string;
  action: 'REINVEST' | 'RECEIVE';
  emoValueAtEvent: number;
  executedAt: string;
}

interface DividendListData {
  pending: PendingItem[];
  completed: CompletedItem[];
}

export default function DividendListFeature() {
  const [data, setData] = useState<DividendListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/dividend');
      if (!res.ok) throw new Error('Failed to load dividends');
      const json = (await res.json()) as DividendListData;
      setData(json);
    } catch {
      setError('配当データの取得に失敗しました');
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

  return (
    <div className="mx-auto grid max-w-3xl gap-6 p-4 pb-24">
      {/* Pending Section */}
      <section className="grid gap-3">
        <h2 className="text-lg font-bold">未開封の配当</h2>
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700"
            />
          ))
        ) : data && data.pending.length > 0 ? (
          data.pending.map((item) => (
            <PendingDividendItem
              key={item.photoStorageId}
              albumId={item.albumId}
              albumName={item.albumName}
              photoStorageId={item.photoStorageId}
              photoStorageName={item.photoStorageName}
              photoCount={item.photoCount}
              emoValue={item.emoValue}
              tags={item.tags}
              onComplete={fetchData}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">
            未開封の配当はありません
          </div>
        )}
      </section>

      {/* Completed Section */}
      <section className="grid gap-3">
        <h2 className="text-lg font-bold">開封済みの配当</h2>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700"
            />
          ))
        ) : data && data.completed.length > 0 ? (
          data.completed.map((item) => (
            <CompletedDividendItem
              key={item.dividendEventId}
              dividendEventId={item.dividendEventId}
              albumName={item.albumName}
              photoStorageName={item.photoStorageName}
              action={item.action}
              emoValueAtEvent={item.emoValueAtEvent}
              executedAt={item.executedAt}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">
            開封済みの配当はありません
          </div>
        )}
      </section>
    </div>
  );
}
