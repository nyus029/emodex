'use client';

import { useCallback, useEffect, useState } from 'react';
import EmoChart, { type ChartDataPoint } from '@/components/invests/EmoChart';
import PeriodTabs, { type Period } from '@/components/invests/PeriodTabs';
import DividendActionPanel from '@/components/invests/DividendActionPanel';

interface InsightData {
  albumBasicInfo: {
    name: string;
    createdAt: string;
    plannedDividend: string | null;
  };
  emoValueInfo: {
    emoValue: number;
    dayOverDayChange: {
      value: number;
      percentage: number;
    };
  };
}

interface ChartResponse {
  period: string;
  data: ChartDataPoint[];
}

interface InsightFeatureProps {
  albumId: string;
}

export default function InsightFeature({ albumId }: InsightFeatureProps) {
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [period, setPeriod] = useState<Period>('1M');
  const [loadingInsight, setLoadingInsight] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsight = useCallback(async () => {
    setLoadingInsight(true);
    try {
      const res = await fetch(`/api/v1/albums/insight/${albumId}`);
      if (!res.ok) throw new Error('Failed to load insight');
      const data = (await res.json()) as InsightData;
      setInsight(data);
    } catch {
      setError('インサイトデータの取得に失敗しました');
    } finally {
      setLoadingInsight(false);
    }
  }, [albumId]);

  const fetchChart = useCallback(async () => {
    setLoadingChart(true);
    try {
      const res = await fetch(
        `/api/v1/albums/${albumId}/chart?period=${period}`,
      );
      if (!res.ok) throw new Error('Failed to load chart');
      const data = (await res.json()) as ChartResponse;
      setChartData(data.data);
    } catch {
      setChartData([]);
    } finally {
      setLoadingChart(false);
    }
  }, [albumId, period]);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  function handleDividendComplete() {
    fetchInsight();
    fetchChart();
  }

  if (error && !insight) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const changeValue = insight?.emoValueInfo.dayOverDayChange.value ?? 0;
  const changePercent = insight?.emoValueInfo.dayOverDayChange.percentage ?? 0;
  const isPositive = changeValue >= 0;

  return (
    <div className="mx-auto grid max-w-3xl gap-6 p-4 pb-24">
      {/* Header */}
      <div>
        {loadingInsight ? (
          <div className="h-6 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        ) : (
          <h1 className="text-lg font-semibold">
            {insight?.albumBasicInfo.name}
          </h1>
        )}
      </div>

      {/* Emo Value Summary */}
      <section className="grid gap-1">
        {loadingInsight ? (
          <>
            <div className="h-10 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          </>
        ) : (
          <>
            <p className="text-3xl font-bold">
              {Math.round(insight?.emoValueInfo.emoValue ?? 0).toLocaleString()}{' '}
              <span className="text-base font-normal text-zinc-500">emo</span>
            </p>
            <p
              className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}
            >
              {isPositive ? '+' : ''}
              {changeValue.toLocaleString()} emo ({isPositive ? '+' : ''}
              {changePercent}%)
            </p>
          </>
        )}
      </section>

      {/* Chart */}
      <section className="grid gap-3">
        <PeriodTabs selected={period} onChange={setPeriod} />
        <EmoChart data={chartData} loading={loadingChart} />
      </section>

      {/* Dividend Action */}
      {insight && (
        <DividendActionPanel
          albumId={albumId}
          plannedDividend={insight.albumBasicInfo.plannedDividend}
          emoValue={insight.emoValueInfo.emoValue}
          onComplete={handleDividendComplete}
        />
      )}

      {/* Album Info */}
      {insight && (
        <section className="grid gap-2 rounded border p-4 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="flex justify-between">
            <span>作成日</span>
            <span>{insight.albumBasicInfo.createdAt}</span>
          </div>
          {insight.albumBasicInfo.plannedDividend && (
            <div className="flex justify-between">
              <span>配当予定日</span>
              <span>
                {new Date(
                  insight.albumBasicInfo.plannedDividend,
                ).toLocaleDateString('ja-JP')}
              </span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
