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
  period?: string;
  height?: number;
}

const MIN_CHART_HEIGHT = 220;
const MAX_CHART_HEIGHT = 360;

function calculateChartHeight(width: number, preferredHeight?: number) {
  if (preferredHeight) return preferredHeight;
  return Math.min(MAX_CHART_HEIGHT, Math.max(MIN_CHART_HEIGHT, width * 0.72));
}

export default function EmoChart({
  data,
  loading,
  period,
  height,
}: EmoChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || loading || data.length === 0) return;

    const initialWidth = containerRef.current.clientWidth;
    const initialHeight = calculateChartHeight(initialWidth, height);

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#71717a',
      },
      grid: {
        vertLines: { color: '#e4e4e7' },
        horzLines: { color: '#e4e4e7' },
      },
      width: initialWidth,
      height: initialHeight,
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
        chart.applyOptions({
          width: entry.contentRect.width,
          height: calculateChartHeight(entry.contentRect.width, height),
        });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, loading, height]);

  const fallbackHeight = height ?? 280;

  if (loading) {
    return (
      <div
        className="animate-pulse rounded-lg bg-gray-100"
        style={{ minHeight: `${fallbackHeight}px` }}
      />
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400"
        style={{ minHeight: `${fallbackHeight}px` }}
      >
        データがありません
      </div>
    );
  }

  return <div ref={containerRef} data-period={period} />;
}
