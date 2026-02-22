'use client';

import MiniEmoChart from './MiniEmoChart';

export type MoverAlbum = {
  id: string;
  name: string;
  emoValue: number;
  changePercentage: number;
  chartData: { time: string; value: number }[];
};

interface AlbumMoversSectionProps {
  risers: MoverAlbum[];
  fallers: MoverAlbum[];
  loading: boolean;
}

function formatPercentage(p: number): string {
  const sign = p > 0 ? '+' : '';
  return `${sign}${p.toFixed(2)}%`;
}

function formatEmoValue(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}千`;
  return v.toFixed(0);
}

export default function AlbumMoversSection({
  risers,
  fallers,
  loading,
}: AlbumMoversSectionProps) {
  if (loading) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-lg bg-gray-100"
          />
        ))}
      </div>
    );
  }

  if (risers.length === 0 && fallers.length === 0) {
    return (
      <div className="flex h-[100px] items-center justify-center text-sm text-gray-400">
        まだデータがありません
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {risers.length > 0 && (
        <div className="grid gap-2">
          <h3 className="text-xs font-semibold text-green-700">上昇 TOP3</h3>
          {risers.map((album) => (
            <div
              key={album.id}
              className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50/50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {album.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {formatEmoValue(album.emoValue)}
                  </span>
                  <span className="text-xs font-semibold text-green-600">
                    {formatPercentage(album.changePercentage)}
                  </span>
                </div>
              </div>
              <div className="w-[100px] shrink-0">
                <MiniEmoChart data={album.chartData} color="green" />
              </div>
            </div>
          ))}
        </div>
      )}

      {fallers.length > 0 && (
        <div className="grid gap-2">
          <h3 className="text-xs font-semibold text-red-700">下落 TOP3</h3>
          {fallers.map((album) => (
            <div
              key={album.id}
              className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {album.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {formatEmoValue(album.emoValue)}
                  </span>
                  <span className="text-xs font-semibold text-red-600">
                    {formatPercentage(album.changePercentage)}
                  </span>
                </div>
              </div>
              <div className="w-[100px] shrink-0">
                <MiniEmoChart data={album.chartData} color="red" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
