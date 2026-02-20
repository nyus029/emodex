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
}

interface EmoChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
}

export default function EmoChart({ data, loading }: EmoChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

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

    const series = chart.addSeries(AreaSeries, {
      topColor: 'rgba(34, 197, 94, 0.4)',
      bottomColor: 'rgba(34, 197, 94, 0.02)',
      lineColor: '#22c55e',
      lineWidth: 2,
    });

    series.setData(data);
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
    return (
      <div className="h-[300px] animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-zinc-400">
        データがありません
      </div>
    );
  }

  return <div ref={containerRef} />;
}
