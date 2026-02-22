'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  AreaSeries,
  type IChartApi,
  ColorType,
} from 'lightweight-charts';

interface MiniEmoChartProps {
  data: { time: string; value: number }[];
  color: 'green' | 'red';
}

const COLORS = {
  green: {
    line: '#22c55e',
    top: 'rgba(34, 197, 94, 0.4)',
    bottom: 'rgba(34, 197, 94, 0.02)',
  },
  red: {
    line: '#ef4444',
    top: 'rgba(239, 68, 68, 0.4)',
    bottom: 'rgba(239, 68, 68, 0.02)',
  },
};

export default function MiniEmoChart({ data, color }: MiniEmoChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const c = COLORS[color];
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'transparent',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      width: containerRef.current.clientWidth,
      height: 60,
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: { mode: 0 },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(AreaSeries, {
      topColor: c.top,
      bottomColor: c.bottom,
      lineColor: c.line,
      lineWidth: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
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
  }, [data, color]);

  if (data.length === 0) return null;

  return <div ref={containerRef} />;
}
