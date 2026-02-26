'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  AreaSeries,
  type IChartApi,
  ColorType,
} from 'lightweight-charts';

export interface ChartDataPoint {
  time: string;
  value: number;
  isDecline?: boolean;
}

interface EmoChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
  changeValue: number;
  isPositive: boolean;
}

export default function EmoChart({
  data,
  loading,
  changeValue,
  isPositive,
}: EmoChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const latestPoint = data[data.length - 1];
  const prevPoint = data[data.length - 2];
  const slope =
    latestPoint && prevPoint
      ? ((latestPoint.value - prevPoint.value) / Math.max(prevPoint.value, 1)) *
        100
      : null;
  const badgeColor = isPositive
    ? 'text-green bg-green/10'
    : 'text-red-500 bg-red-500/10';
  const trendLabel = isPositive ? '上昇トレンド' : '下降トレンド';

  useEffect(() => {
    if (!containerRef.current || loading || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#71717a',
      },
      grid: {
        vertLines: { color: '#e4e4e7' },
        horzLines: { color: '#e4e4e7' },
      },
      width: containerRef.current.clientWidth,
      height: 300,
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
      },
    });

    const hasDecline = data.some((d) => d.isDecline);

    if (!hasDecline) {
      const series = chart.addSeries(AreaSeries, {
        topColor: 'rgba(34, 197, 94, 0.4)',
        bottomColor: 'rgba(34, 197, 94, 0.02)',
        lineColor: '#22c55e',
        lineWidth: 2,
      });
      series.setData(data);
    } else {
      const normalData: ChartDataPoint[] = [];
      const declineData: ChartDataPoint[] = [];

      for (let i = 0; i < data.length; i++) {
        const point = data[i];
        const prev = data[i - 1];
        const next = data[i + 1];

        if (point.isDecline) {
          declineData.push(point);
          if (prev && !prev.isDecline) {
            declineData.push(prev);
          }
          if (next && !next.isDecline) {
            normalData.push(point);
          }
        } else {
          normalData.push(point);
          if (prev && prev.isDecline) {
            normalData.push(prev);
          }
          if (next && next.isDecline) {
            declineData.push(point);
          }
        }
      }

      const dedup = (arr: ChartDataPoint[]) => {
        const map = new Map<string, ChartDataPoint>();
        for (const p of arr) map.set(p.time, p);
        return Array.from(map.values()).sort((a, b) =>
          a.time.localeCompare(b.time),
        );
      };

      const normalSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(34, 197, 94, 0.4)',
        bottomColor: 'rgba(34, 197, 94, 0.02)',
        lineColor: '#22c55e',
        lineWidth: 2,
      });
      normalSeries.setData(dedup(normalData));

      const declineSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(239, 68, 68, 0.4)',
        bottomColor: 'rgba(239, 68, 68, 0.02)',
        lineColor: '#ef4444',
        lineWidth: 2,
      });
      declineSeries.setData(dedup(declineData));
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, loading]);

  if (loading) {
    return <div className="h-[300px] animate-pulse rounded-lg bg-gray-100" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
        データがありません
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={containerRef} />
      <div
        className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-medium ${badgeColor}`}
      >
        {trendLabel} {isPositive ? '+' : ''}
        {changeValue.toLocaleString()} emo
      </div>
      {slope !== null && (
        <div
          className={`pointer-events-none absolute left-2 top-2 rounded-md px-2 py-1 text-[11px] font-medium ${badgeColor}`}
        >
          直近傾き: {slope >= 0 ? '+' : ''}
          {slope.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
