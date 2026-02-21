'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

interface Photo {
  id: string;
  fileName: string;
  blobUrl: string;
  contentType: string | null;
}

interface DividendDetailData {
  dividendEvent: {
    id: string;
    action: 'REINVEST' | 'RECEIVE';
    emoValueAtEvent: number;
    previousBaseEmo: number;
    newBaseEmo: number;
    executedAt: string;
  };
  album: { id: string; name: string };
  photoStorage: {
    id: string;
    name: string;
    photoCount: number;
    isCompoundActive: boolean;
    tags: string[];
    photosVisible: boolean;
    photosExpireAt: string | null;
    photos: Photo[];
  };
}

interface DividendDetailFeatureProps {
  eventId: string;
}

export default function DividendDetailFeature({
  eventId,
}: DividendDetailFeatureProps) {
  const [data, setData] = useState<DividendDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reinvestSubmitting, setReinvestSubmitting] = useState(false);
  const [reinvestDone, setReinvestDone] = useState(false);
  const [reinvestError, setReinvestError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/dividend/${eventId}`);
      if (!res.ok) throw new Error('Failed to load dividend detail');
      const json = (await res.json()) as DividendDetailData;
      setData(json);
    } catch {
      setError('配当詳細の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleReinvest() {
    if (!data) return;
    if (
      !window.confirm(
        '配当を再投資しますか？ 基準価格が2倍になり、複利が再スタートします。',
      )
    )
      return;
    setReinvestSubmitting(true);
    setReinvestError(null);
    try {
      const res = await fetch(`/api/v1/albums/${data.album.id}/dividend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REINVEST',
          photoStorageId: data.photoStorage.id,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? '再投資に失敗しました');
      }
      setReinvestDone(true);
    } catch (e) {
      setReinvestError(e instanceof Error ? e.message : '再投資に失敗しました');
    } finally {
      setReinvestSubmitting(false);
    }
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-background-light p-5">
        <div className="mx-auto max-w-md rounded-xl bg-white px-4 py-3 shadow-card">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const photosVisible = data?.photoStorage.photosVisible ?? false;
  const photos = photosVisible ? (data?.photoStorage.photos ?? []) : [];
  const photoSlots = Array.from({ length: 9 }).map(
    (_, index) => photos[index] ?? null,
  );
  const formattedExecutedAt = data
    ? new Date(data.dividendEvent.executedAt).toLocaleDateString('ja-JP')
    : '';

  return (
    <div className="min-h-screen bg-background-light p-5">
      <div className="mx-auto max-w-md pb-24">
        {loading ? (
          <div className="space-y-8">
            <div className="h-28 animate-pulse rounded-xl bg-white shadow-card" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-xl bg-white shadow-card"
                />
              ))}
            </div>
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-white px-4 py-3 shadow-card">
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
                    <div className="truncate text-[15px] font-medium text-gray-900">
                      {data.album.name}
                    </div>
                  </div>
                  <div className="mt-1 space-y-1 text-[13px] text-gray-800">
                    <div className="flex gap-3">
                      <span className="w-12 text-gray-500">配当日</span>
                      <span className="tabular-nums">
                        {formattedExecutedAt}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <span className="w-12 text-gray-500">期限</span>
                      <span className="truncate">{data.photoStorage.name}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span
                  className={`rounded px-1.5 py-0.5 font-medium ${
                    data.dividendEvent.action === 'REINVEST'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {data.dividendEvent.action === 'REINVEST' ? '再投資' : '受取'}
                </span>
                <span className="text-gray-500">
                  {Math.round(
                    data.dividendEvent.emoValueAtEvent,
                  ).toLocaleString()}{' '}
                  emo
                </span>
              </div>
            </div>

            {photosVisible ? (
              <>
                {data.photoStorage.photosExpireAt && (
                  <p className="px-1 text-xs text-gray-500">
                    写真の閲覧期限:{' '}
                    {new Date(
                      data.photoStorage.photosExpireAt,
                    ).toLocaleDateString('ja-JP')}
                  </p>
                )}
                <section className="grid grid-cols-3 gap-2">
                  {photoSlots.map((photo, index) => (
                    <div
                      key={photo?.id ?? `placeholder-${index}`}
                      className="relative aspect-square"
                    >
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo.blobUrl}
                          alt={photo.fileName}
                          className="h-full w-full rounded-xl object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full rounded-xl bg-white shadow-card" />
                      )}
                    </div>
                  ))}
                </section>
              </>
            ) : (
              <div className="rounded-xl bg-white px-4 py-6 shadow-card text-center">
                <p className="text-sm text-gray-500">
                  {data.dividendEvent.action === 'REINVEST'
                    ? '再投資済みのため写真は表示できません'
                    : '閲覧期限が過ぎたため写真は表示できません'}
                </p>
              </div>
            )}

            {data.dividendEvent.action === 'RECEIVE' &&
              !data.photoStorage.isCompoundActive &&
              !reinvestDone && (
                <div className="rounded-xl bg-white px-4 py-4 shadow-card">
                  <button
                    type="button"
                    onClick={handleReinvest}
                    disabled={reinvestSubmitting}
                    className="w-full rounded-lg bg-green px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {reinvestSubmitting ? '処理中...' : '再投資する'}
                  </button>
                  {reinvestError && (
                    <p className="mt-2 text-xs text-red-600">{reinvestError}</p>
                  )}
                </div>
              )}

            {reinvestDone && (
              <div className="rounded-xl bg-green/10 px-4 py-4 shadow-card text-center">
                <p className="text-sm font-medium text-green">
                  再投資が完了しました
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
