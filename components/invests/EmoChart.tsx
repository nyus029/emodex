'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  AreaSeries,
  type IChartApi,
  type Time,
  type MouseEventParams,
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

const formatDateLabel = (time: string): string => {
  const normalized = time.includes('T') ? time.split('T')[0] : time;
  const [year, month, day] = normalized.split('-').map(Number);

  if (year && month && day) {
    return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
  }

  const parsed = new Date(time);
  if (Number.isNaN(parsed.getTime())) {
    return '--/--';
  }

  return `${String(parsed.getMonth() + 1).padStart(2, '0')}/${String(parsed.getDate()).padStart(2, '0')}`;
};

const normalizeTime = (time: Time): string => {
  if (typeof time === 'string') {
    return time;
  }

  if (typeof time === 'number') {
    return new Date(time * 1000).toISOString().slice(0, 10);
  }

  return `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;
};

export default function EmoChart({ data, loading }: EmoChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    time: string;
    value: number;
  } | null>(null);
  const latestValue = useMemo(
    () => data[data.length - 1]?.value ?? null,
    [data],
  );

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
        tickMarkFormatter: (time) => formatDateLabel(normalizeTime(time)),
      },
    });

    const series = chart.addSeries(AreaSeries, {
      topColor: 'rgba(34, 197, 94, 0.4)',
      bottomColor: 'rgba(34, 197, 94, 0.02)',
      lineColor: '#22c55e',
      lineWidth: 2,
    });

    series.setData(data);
    series.createPriceLine({
      price: data[data.length - 1].value,
      color: '#16a34a',
      lineVisible: false,
      axisLabelVisible: true,
      title: 'Latest emo',
    });

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!param.point || !param.time) {
        setHoverInfo(null);
        return;
      }

      const seriesData = param.seriesData.get(series);
      if (
        !seriesData ||
        !('value' in seriesData) ||
        typeof seriesData.value !== 'number'
      ) {
        setHoverInfo(null);
        return;
      }

      setHoverInfo({
        time: normalizeTime(param.time),
        value: seriesData.value,
      });
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
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

      <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs text-gray-600 shadow-sm">
        {hoverInfo
          ? `${formatDateLabel(hoverInfo.time)} / ${hoverInfo.value.toFixed(2)}`
          : 'Hover to inspect'}
      </div>

      <div className="pointer-events-none absolute right-2 top-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 shadow-sm">
        最新 emo: {latestValue?.toFixed(2) ?? '--'}
      </div>
    </div>
  );
}
