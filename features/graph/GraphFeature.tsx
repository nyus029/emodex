'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const ExponentialChart = dynamic(
  () => import('@/components/graph/ExponentialChart'),
  { ssr: false },
);

type DataPoint = {
  time: number;
  value: number;
};

export default function GraphFeature() {
  const dataPoints = useMemo<DataPoint[]>(() => {
    return Array.from({ length: 11 }, (_, i) => {
      const t = i / 10; // 0, 0.1, 0.2, ..., 1.0
      const value = 100 * Math.pow(10, t);
      return { time: t, value };
    });
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link
          href="/"
          className="text-sm underline hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          ホームへ戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold">指数関数グラフ</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        初期値100で、一年で十倍になる指数関数 y = 100 × 10^t のグラフ
      </p>

      <div className="rounded border p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">グラフ</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            一年間を10分割した11点をプロット（t = 0, 0.1, 0.2, ..., 1.0）
          </p>
        </div>
        <ExponentialChart data={dataPoints} />
      </div>

      <div className="rounded border p-4">
        <h2 className="text-lg font-semibold mb-2">データポイント</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">時間（年）</th>
                <th className="text-right p-2">値</th>
              </tr>
            </thead>
            <tbody>
              {dataPoints.map((point, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2">{point.time}年</td>
                  <td className="text-right p-2">{point.value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
