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
      <div className="min-h-screen bg-background-light p-5">
        <div className="mx-auto max-w-md rounded-xl bg-white px-4 py-3 shadow-card">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const changeValue = insight?.emoValueInfo.dayOverDayChange.value ?? 0;
  const changePercent = insight?.emoValueInfo.dayOverDayChange.percentage ?? 0;
  const isPositive = changeValue >= 0;

  return (
    <div className="min-h-screen bg-background-light p-5">
      <div className="mx-auto max-w-md space-y-4 pb-24">
        {/* Header + Emo Value Card */}
        <div className="rounded-xl bg-white px-5 py-4 shadow-card">
          {loadingInsight ? (
            <>
              <div className="h-5 w-36 animate-pulse rounded-lg bg-gray-100" />
              <div className="mt-3 h-8 w-40 animate-pulse rounded-lg bg-gray-100" />
              <div className="mt-1 h-4 w-28 animate-pulse rounded-lg bg-gray-100" />
            </>
          ) : (
            <>
              <h1 className="text-[15px] font-medium text-gray-900">
                {insight?.albumBasicInfo.name}
              </h1>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {Math.round(
                  insight?.emoValueInfo.emoValue ?? 0,
                ).toLocaleString()}{' '}
                <span className="text-sm font-normal text-gray-500">emo</span>
              </p>
              <p
                className={`mt-0.5 text-[13px] font-medium ${isPositive ? 'text-green' : 'text-red-500'}`}
              >
                {isPositive ? '+' : ''}
                {changeValue.toLocaleString()} emo ({isPositive ? '+' : ''}
                {changePercent}%)
              </p>
            </>
          )}
        </div>

        {/* Chart Card */}
        <div className="rounded-xl bg-white px-4 py-4 shadow-card">
          <PeriodTabs selected={period} onChange={setPeriod} />
          <div className="mt-3">
            <EmoChart data={chartData} loading={loadingChart} />
          </div>
        </div>

        {/* Dividend Action */}
        {insight && (
          <DividendActionPanel
            albumId={albumId}
            plannedDividend={insight.albumBasicInfo.plannedDividend}
            emoValue={insight.emoValueInfo.emoValue}
            onComplete={handleDividendComplete}
          />
        )}

        {/* Album Info Card */}
        {insight && (
          <div className="rounded-xl bg-white px-4 py-3 shadow-card">
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-gray-500">作成日</span>
                <span className="text-gray-800">
                  {insight.albumBasicInfo.createdAt}
                </span>
              </div>
              {insight.albumBasicInfo.plannedDividend && (
                <div className="flex justify-between">
                  <span className="text-gray-500">配当予定日</span>
                  <span className="text-gray-800">
                    {new Date(
                      insight.albumBasicInfo.plannedDividend,
                    ).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
