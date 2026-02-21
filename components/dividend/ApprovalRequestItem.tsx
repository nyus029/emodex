'use client';

import Image from 'next/image';
import { useState } from 'react';

interface ApprovalRequestItemProps {
  approvalRequestId: string;
  albumName: string;
  photoStorageName: string;
  photoCount: number;
  emoValueAtRequest: number;
  tags: string[];
  requestedBy: { id: number; name: string };
  expiresAt: string;
  approvedCount: number;
  totalCount: number;
  myApproval: boolean;
  onComplete: () => void;
}

export default function ApprovalRequestItem({
  approvalRequestId,
  albumName,
  photoStorageName,
  photoCount,
  emoValueAtRequest,
  tags,
  requestedBy,
  expiresAt,
  approvedCount,
  totalCount,
  myApproval,
  onComplete,
}: ApprovalRequestItemProps) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedExpiry = new Date(expiresAt).toLocaleDateString('ja-JP');

  async function handleApprove() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/dividend/approvals/${approvalRequestId}`,
        { method: 'POST' },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? 'Failed to approve',
        );
      }
      setConfirming(false);
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
          この配当受取を承認しますか？ 全員が承認すると配当が実行されます。
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={submitting}
            className="h-[38px] rounded-lg bg-green px-4 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '処理中...' : '承認する'}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={submitting}
            className="h-[38px] rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
              <span className="w-12 text-gray-500">期限</span>
              <span className="truncate text-gray-700">{photoStorageName}</span>
            </div>
            <div className="flex gap-3">
              <span className="w-12 text-gray-500">申請者</span>
              <span className="truncate text-gray-700">{requestedBy.name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>{photoCount} 枚</span>
        <span>{Math.round(emoValueAtRequest).toLocaleString()} emo</span>
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          <span>
            承認 {approvedCount}/{totalCount}
          </span>
          <span className="ml-2">期限 {formattedExpiry}</span>
        </div>
        {myApproval ? (
          <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-500">
            承認済み
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="h-[40px] rounded-lg bg-green px-6 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            承認する
          </button>
        )}
      </div>
    </div>
  );
}
