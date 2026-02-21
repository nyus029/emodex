'use client';

import { useCallback, useEffect, useState } from 'react';
import PendingDividendItem from '@/components/dividend/PendingDividendItem';
import ApprovalRequestItem from '@/components/dividend/ApprovalRequestItem';
import CompletedDividendItem from '@/components/dividend/CompletedDividendItem';

interface PendingItem {
  albumId: string;
  albumName: string;
  albumType: string;
  plannedDividend: string;
  photoStorageId: string;
  photoStorageName: string;
  photoCount: number;
  emoValue: number;
  tags: string[];
}

interface ApprovalRequestItemData {
  approvalRequestId: string;
  albumId: string;
  albumName: string;
  photoStorageId: string;
  photoStorageName: string;
  photoCount: number;
  emoValueAtRequest: number;
  tags: string[];
  requestedBy: { id: number; name: string };
  status: string;
  expiresAt: string;
  createdAt: string;
  approvedCount: number;
  totalCount: number;
  myApproval: boolean;
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
  approvalRequests: ApprovalRequestItemData[];
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

  const hasPendingItems =
    (data && data.pending.length > 0) ||
    (data && data.approvalRequests.length > 0);

  return (
    <div className="min-h-screen bg-background-light p-5">
      <div className="mx-auto grid max-w-md gap-4 pb-24">
        <section className="grid gap-3">
          <h2 className="px-1 text-sm font-semibold text-gray-600">配当待ち</h2>
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl bg-white shadow-card"
              />
            ))
          ) : hasPendingItems ? (
            <>
              {data!.approvalRequests.map((item) => (
                <ApprovalRequestItem
                  key={item.approvalRequestId}
                  approvalRequestId={item.approvalRequestId}
                  albumName={item.albumName}
                  photoStorageName={item.photoStorageName}
                  photoCount={item.photoCount}
                  emoValueAtRequest={item.emoValueAtRequest}
                  tags={item.tags}
                  requestedBy={item.requestedBy}
                  expiresAt={item.expiresAt}
                  approvedCount={item.approvedCount}
                  totalCount={item.totalCount}
                  myApproval={item.myApproval}
                  onComplete={fetchData}
                />
              ))}
              {data!.pending.map((item) => (
                <PendingDividendItem
                  key={item.photoStorageId}
                  albumId={item.albumId}
                  albumName={item.albumName}
                  albumType={item.albumType}
                  plannedDividend={item.plannedDividend}
                  photoStorageId={item.photoStorageId}
                  photoStorageName={item.photoStorageName}
                  photoCount={item.photoCount}
                  emoValue={item.emoValue}
                  tags={item.tags}
                  onComplete={fetchData}
                />
              ))}
            </>
          ) : (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-card">
              配当待ちはありません
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
