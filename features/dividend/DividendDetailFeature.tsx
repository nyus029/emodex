'use client';

import { useCallback, useEffect, useState } from 'react';
import DividendEventHeader from '@/components/dividend/DividendEventHeader';
import PhotoGallery from '@/components/dividend/PhotoGallery';

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
    tags: string[];
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

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6 p-4 pb-24">
      {loading ? (
        <>
          <div className="h-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-8 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"
              />
            ))}
          </div>
        </>
      ) : data ? (
        <>
          <DividendEventHeader
            action={data.dividendEvent.action}
            emoValueAtEvent={data.dividendEvent.emoValueAtEvent}
            previousBaseEmo={data.dividendEvent.previousBaseEmo}
            newBaseEmo={data.dividendEvent.newBaseEmo}
            executedAt={data.dividendEvent.executedAt}
            albumName={data.album.name}
            photoStorageName={data.photoStorage.name}
          />

          <section className="grid gap-3">
            <h2 className="text-lg font-bold">
              写真 ({data.photoStorage.photoCount})
            </h2>
            <PhotoGallery photos={data.photoStorage.photos} />
          </section>
        </>
      ) : null}
    </div>
  );
}
