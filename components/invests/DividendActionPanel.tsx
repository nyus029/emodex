'use client';

import { useState } from 'react';

interface DividendActionPanelProps {
  albumId: string;
  plannedDividend: string | null;
  emoValue: number;
  onComplete: () => void;
  /** 配当受取成功時に呼ばれる。作成された配当イベントIDの配列を渡す。遷移先は呼び出し側で /dividend/[id] などに使える。 */
  onReceiveSuccess?: (eventIds: string[]) => void;
}

export default function DividendActionPanel({
  albumId,
  plannedDividend,
  emoValue,
  onComplete,
  onReceiveSuccess,
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
      <div className="rounded-xl bg-white px-4 py-3 text-[13px] text-gray-500 shadow-card">
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
      const body = (await res.json().catch(() => null)) as {
        events?: Array<{ id: string }>;
      } | null;
      setConfirming(null);
      if (action === 'RECEIVE' && body?.events?.length && onReceiveSuccess) {
        onReceiveSuccess(body.events.map((e) => e.id));
      } else {
        onComplete();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  if (confirming) {
    return (
      <div className="grid gap-3 rounded-xl bg-amber-50 px-4 py-4 shadow-card">
        <p className="text-[13px] font-medium text-gray-900">
          {confirming === 'REINVEST'
            ? `配当再投資を実行しますか？ 基準価格が2倍になり、複利が再スタートします。`
            : `配当受取を実行しますか？ エモ価 ${Math.round(emoValue).toLocaleString()} emo を受け取り、複利が停止します。`}
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => handleAction(confirming)}
            disabled={submitting}
            className="rounded-lg bg-green px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? '処理中...' : '実行する'}
          </button>
          <button
            onClick={() => {
              setConfirming(null);
              setError(null);
            }}
            disabled={submitting}
            className="rounded-lg bg-light-gray px-4 py-2 text-sm font-medium text-gray-600 disabled:opacity-50"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl bg-white px-4 py-4 shadow-card">
      <p className="text-[13px] font-medium text-gray-900">
        配当日に到達しました！ アクションを選択してください。
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setConfirming('REINVEST')}
          className="rounded-lg bg-green px-4 py-2 text-sm font-medium text-white"
        >
          再投資する
        </button>
        <button
          onClick={() => setConfirming('RECEIVE')}
          className="rounded-lg bg-light-gray px-4 py-2 text-sm font-medium text-gray-600"
        >
          受け取る
        </button>
      </div>
    </div>
  );
}
