'use client';

import Image from 'next/image';
import { useState } from 'react';

interface PendingDividendItemProps {
  albumId: string;
  albumName: string;
  plannedDividend: string;
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
  plannedDividend,
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
  const formattedPlannedDividend = new Date(plannedDividend).toLocaleDateString(
    'ja-JP',
  );

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
      <div className="grid gap-3 rounded-xl bg-white px-4 py-3 shadow-card">
        <div className="grid gap-1">
          <p className="text-xs text-gray-500">{albumName}</p>
          <p className="text-[15px] font-medium text-gray-900">
            {photoStorageName}
          </p>
        </div>
        <p className="text-sm text-gray-800">
          {confirming === 'REINVEST'
            ? '配当再投資を実行しますか？ 基準価格が2倍になり、複利が再スタートします。'
            : `配当受取を実行しますか？ エモ価 ${Math.round(emoValue).toLocaleString()} emo を受け取り、複利が停止します。`}
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => handleAction(confirming)}
            disabled={submitting}
            className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? '処理中...' : '実行する'}
          </button>
          <button
            onClick={() => {
              setConfirming(null);
              setError(null);
            }}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:opacity-50"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl bg-white px-4 py-3 shadow-card">
      <div className="flex items-center gap-4">
        <Image
          src="/mockphoto.png"
          alt="thumbnail"
          width={64}
          height={64}
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Image
              src="/users.svg"
              alt="user"
              width={20}
              height={20}
              className="shrink-0"
            />
            <p className="truncate text-[15px] font-medium text-gray-900">
              {albumName}
            </p>
          </div>
          <div className="mt-1 space-y-1 text-[13px] text-gray-800">
            <div className="flex gap-3">
              <span className="w-12 text-gray-500">配当日</span>
              <span className="tabular-nums">{formattedPlannedDividend}</span>
            </div>
            <div className="flex gap-3">
              <span className="w-12 text-gray-500">期限</span>
              <span className="truncate text-gray-700">{photoStorageName}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>{photoCount} 枚</span>
        <span>{Math.round(emoValue).toLocaleString()} emo</span>
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => setConfirming('REINVEST')}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white"
        >
          再投資する
        </button>
        <button
          onClick={() => setConfirming('RECEIVE')}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
        >
          受け取る
        </button>
      </div>
    </div>
  );
}
