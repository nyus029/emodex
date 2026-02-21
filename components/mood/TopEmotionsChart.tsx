'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  AreaSeries,
  type IChartApi,
  ColorType,
} from 'lightweight-charts';

export interface TopEmotionItem {
  word: string;
  totalCount: number;
  data: { time: string; value: number }[];
}

interface TopEmotionsChartProps {
  topEmotions: TopEmotionItem[];
  loading: boolean;
}

const COLORS = [
  {
    line: '#22c55e',
    top: 'rgba(34, 197, 94, 0.4)',
    bottom: 'rgba(34, 197, 94, 0.02)',
  },
  {
    line: '#34d399',
    top: 'rgba(52, 211, 153, 0.4)',
    bottom: 'rgba(52, 211, 153, 0.02)',
  },
  {
    line: '#6ee7b7',
    top: 'rgba(110, 231, 183, 0.4)',
    bottom: 'rgba(110, 231, 183, 0.02)',
  },
];

export default function TopEmotionsChart({
  topEmotions,
  loading,
}: TopEmotionsChartProps) {
  const containerRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  const chartRefs = useRef<(IChartApi | null)[]>([null, null, null]);

  useEffect(() => {
    if (loading || topEmotions.length === 0) return;

    const observers: ResizeObserver[] = [];

    topEmotions.forEach((emotion, i) => {
      const container = containerRefs[i]?.current;
      if (!container || emotion.data.length === 0) return;

      const chart = createChart(container, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#71717a',
        },
        grid: {
          vertLines: { color: '#e4e4e7' },
          horzLines: { color: '#e4e4e7' },
        },
        width: container.clientWidth,
        height: 150,
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false },
      });

      const color = COLORS[i] ?? COLORS[0];
      const series = chart.addSeries(AreaSeries, {
        topColor: color.top,
        bottomColor: color.bottom,
        lineColor: color.line,
        lineWidth: 2,
      });

      series.setData(emotion.data);
      chart.timeScale().fitContent();
      chartRefs.current[i] = chart;

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          chart.applyOptions({ width: entry.contentRect.width });
        }
      });
      observer.observe(container);
      observers.push(observer);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
      chartRefs.current.forEach((chart) => chart?.remove());
      chartRefs.current = [null, null, null];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topEmotions, loading]);

  if (loading) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[180px] animate-pulse rounded-lg bg-gray-100"
          />
        ))}
      </div>
    );
  }

  if (topEmotions.length === 0) {
    return (
      <div className="flex h-[150px] items-center justify-center text-sm text-gray-400">
        まだ心象データがありません
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {topEmotions.map((emotion, i) => (
        <div key={emotion.word}>
          <div className="mb-1 flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS[i]?.line ?? COLORS[0].line }}
            />
            <span className="text-xs font-medium text-gray-700">
              {emotion.word}
            </span>
            <span className="text-xs text-gray-400">
              ({emotion.totalCount}回)
            </span>
          </div>
          <div ref={containerRefs[i]} />
        </div>
      ))}
    </div>
  );
}
