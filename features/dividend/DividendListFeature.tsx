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
      <div className="min-h-screen bg-background-light p-5">
        <div className="mx-auto max-w-md rounded-xl bg-white px-4 py-3 shadow-card">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light p-5">
      <div className="mx-auto grid max-w-md gap-4 pb-24">
        <section className="grid gap-3">
          <h2 className="px-1 text-sm font-semibold text-gray-600">
            未開封の配当
          </h2>
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl bg-white shadow-card"
              />
            ))
          ) : data && data.pending.length > 0 ? (
            data.pending.map((item) => (
              <PendingDividendItem
                key={item.photoStorageId}
                albumId={item.albumId}
                albumName={item.albumName}
                plannedDividend={item.plannedDividend}
                photoStorageId={item.photoStorageId}
                photoStorageName={item.photoStorageName}
                photoCount={item.photoCount}
                emoValue={item.emoValue}
                tags={item.tags}
                onComplete={fetchData}
              />
            ))
          ) : (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-card">
              未開封の配当はありません
            </div>
          )}
        </section>

        <section className="grid gap-3">
          <h2 className="px-1 text-sm font-semibold text-gray-600">
            開封済みの配当
          </h2>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-white shadow-card"
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
            <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-card">
              開封済みの配当はありません
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
