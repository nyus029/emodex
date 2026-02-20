'use client';

import { useState } from 'react';

interface DividendActionPanelProps {
  albumId: string;
  plannedDividend: string | null;
  emoValue: number;
  onComplete: () => void;
}

export default function DividendActionPanel({
  albumId,
  plannedDividend,
  emoValue,
  onComplete,
}: DividendActionPanelProps) {
  const [confirming, setConfirming] = useState<'REINVEST' | 'RECEIVE' | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!plannedDividend) return null;

  const dividendDate = new Date(plannedDividend);
  const isReached = dividendDate <= new Date();

  if (!isReached) {
    return (
      <div className="rounded border p-4 text-sm text-zinc-500">
        配当予定日: {dividendDate.toLocaleDateString('ja-JP')}
      </div>
    );
  }

  async function handleAction(action: 'REINVEST' | 'RECEIVE') {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/albums/${albumId}/dividend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
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
      <div className="grid gap-3 rounded border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
        <p className="text-sm font-medium">
          {confirming === 'REINVEST'
            ? `配当再投資を実行しますか？ 基準価格が2倍になり、複利が再スタートします。`
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
    <div className="grid gap-3 rounded border border-green-300 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/20">
      <p className="text-sm font-medium">
        配当日に到達しました！ アクションを選択してください。
      </p>
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
