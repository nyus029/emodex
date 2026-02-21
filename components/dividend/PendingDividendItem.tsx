'use client';

import { useState } from 'react';

interface PendingDividendItemProps {
  albumId: string;
  albumName: string;
  photoStorageId: string;
  photoStorageName: string;
  photoCount: number;
  emoValue: number;
  tags: string[];
  onComplete: () => void;
}

export default function PendingDividendItem({
  albumId,
  albumName,
  photoStorageId,
  photoStorageName,
  photoCount,
  emoValue,
  tags,
  onComplete,
}: PendingDividendItemProps) {
  const [confirming, setConfirming] = useState<'REINVEST' | 'RECEIVE' | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: 'REINVEST' | 'RECEIVE') {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/albums/${albumId}/dividend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, photoStorageId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? 'Failed to execute dividend',
        );
      }
      setConfirming(null);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  if (confirming) {
    return (
      <div className="grid gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
        <div className="grid gap-1">
          <p className="text-xs text-zinc-500">{albumName}</p>
          <p className="font-medium">{photoStorageName}</p>
        </div>
        <p className="text-sm">
          {confirming === 'REINVEST'
            ? '配当再投資を実行しますか？ 基準価格が2倍になり、複利が再スタートします。'
            : `配当受取を実行しますか？ エモ価 ${Math.round(emoValue).toLocaleString()} emo を受け取り、複利が停止します。`}
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => handleAction(confirming)}
            disabled={submitting}
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? '処理中...' : '実行する'}
          </button>
          <button
            onClick={() => {
              setConfirming(null);
              setError(null);
            }}
            disabled={submitting}
            className="rounded border px-4 py-2 text-sm disabled:opacity-50"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/20">
      <div className="flex items-start justify-between">
        <div className="grid gap-1">
          <p className="text-xs text-zinc-500">{albumName}</p>
          <p className="font-medium">{photoStorageName}</p>
          <div className="flex gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-0.5 text-right">
          <span className="font-medium">
            {Math.round(emoValue).toLocaleString()}{' '}
            <span className="text-xs font-normal text-zinc-500">emo</span>
          </span>
          <span className="text-xs text-zinc-500">{photoCount} 枚</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setConfirming('REINVEST')}
          className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          再投資する
        </button>
        <button
          onClick={() => setConfirming('RECEIVE')}
          className="rounded border px-4 py-2 text-sm"
        >
          受け取る
        </button>
      </div>
    </div>
  );
}
