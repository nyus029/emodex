'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EmoChart, { type ChartDataPoint } from '@/components/invests/EmoChart';
import PeriodTabs, { type Period } from '@/components/invests/PeriodTabs';
import DividendActionPanel from '@/components/invests/DividendActionPanel';

interface PhotoStorageSummary {
  id: string;
  name: string;
  storagePath: string;
  photoCount: number;
}

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
  photoStorages?: PhotoStorageSummary[];
}

interface ChartResponse {
  period: string;
  data: ChartDataPoint[];
}

interface InsightFeatureProps {
  albumId: string;
}

export default function InsightFeature({ albumId }: InsightFeatureProps) {
  const router = useRouter();
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [period, setPeriod] = useState<Period>('1M');
  const [loadingInsight, setLoadingInsight] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [receiveSubmittingStorageId, setReceiveSubmittingStorageId] = useState<
    string | null
  >(null);

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

  function handleReceiveSuccess(eventIds: string[]) {
    const firstId = eventIds[0];
    if (firstId) router.push(`/dividend/${firstId}`);
  }

  const emoValue = insight?.emoValueInfo.emoValue ?? 0;

  async function handleReceiveClick() {
    const message = `すべてのストレージの配当を受け取りますか？ 合計エモ価 ${Math.round(emoValue).toLocaleString()} emo を受け取り、複利が停止します。`;
    if (!window.confirm(message)) return;
    setReceiveSubmitting(true);
    setReceiveError(null);
    try {
      const res = await fetch(`/api/v1/albums/${albumId}/dividend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RECEIVE' }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? '配当の受取に失敗しました');
      }
      const body = (await res.json().catch(() => null)) as {
        events?: Array<{ id: string }>;
      } | null;
      if (body?.events?.length) {
        handleReceiveSuccess(body.events.map((e) => e.id));
      } else {
        handleDividendComplete();
      }
    } catch (e) {
      setReceiveError(
        e instanceof Error ? e.message : '配当の受取に失敗しました',
      );
    } finally {
      setReceiveSubmitting(false);
    }
  }

  async function handleReceiveStorageClick(photoStorageId: string) {
    if (
      !window.confirm(
        'このストレージの配当を受け取りますか？ 複利が停止します。',
      )
    )
      return;
    setReceiveSubmittingStorageId(photoStorageId);
    setReceiveError(null);
    try {
      const res = await fetch(`/api/v1/albums/${albumId}/dividend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RECEIVE', photoStorageId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? '配当の受取に失敗しました');
      }
      const body = (await res.json().catch(() => null)) as {
        events?: Array<{ id: string }>;
      } | null;
      if (body?.events?.length) {
        handleReceiveSuccess(body.events.map((e) => e.id));
      } else {
        handleDividendComplete();
      }
    } catch (e) {
      setReceiveError(
        e instanceof Error ? e.message : '配当の受取に失敗しました',
      );
    } finally {
      setReceiveSubmittingStorageId(null);
    }
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

        {/* 配当：受け取るボタン */}
        {insight && (
          <div className="space-y-2">
            <h2 className="px-1 text-[13px] font-medium text-gray-900">配当</h2>
            <div className="rounded-xl bg-white px-4 py-4 shadow-card">
              <button
                type="button"
                onClick={handleReceiveClick}
                disabled={receiveSubmitting}
                className="w-full rounded-lg bg-green px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {receiveSubmitting
                  ? '処理中...'
                  : 'すべてのストレージの配当を受け取る'}
              </button>
              {receiveError && (
                <p className="mt-2 text-xs text-red-600">{receiveError}</p>
              )}
            </div>
            <DividendActionPanel
              albumId={albumId}
              plannedDividend={insight.albumBasicInfo.plannedDividend}
              emoValue={insight.emoValueInfo.emoValue}
              onComplete={handleDividendComplete}
              onReceiveSuccess={handleReceiveSuccess}
            />
          </div>
        )}

        {/* Photo Storages（ストレージごとに配当を受け取る） */}
        {insight?.photoStorages && insight.photoStorages.length > 0 && (
          <div className="rounded-xl bg-white px-4 py-3 shadow-card">
            <h2 className="text-[13px] font-medium text-gray-900">
              フォトストレージ
            </h2>
            <ul className="mt-2 space-y-3 text-[13px]">
              {insight.photoStorages.map((ps) => (
                <li
                  key={ps.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800">{ps.name}</span>
                    <span className="text-gray-500">{ps.photoCount}枚</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReceiveStorageClick(ps.id)}
                    disabled={receiveSubmittingStorageId === ps.id}
                    className="shrink-0 rounded-lg bg-green px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                  >
                    {receiveSubmittingStorageId === ps.id
                      ? '処理中...'
                      : '配当を受け取る'}
                  </button>
                </li>
              ))}
            </ul>
            {receiveError && (
              <p className="mt-2 text-xs text-red-600">{receiveError}</p>
            )}
          </div>
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
