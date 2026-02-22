'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EmoChart, { type ChartDataPoint } from '@/components/invests/EmoChart';
import PeriodTabs, { type Period } from '@/components/invests/PeriodTabs';
import DividendActionPanel from '@/components/invests/DividendActionPanel';
import { sendDividendReceivedNotification } from '@/lib/dividend-notification';

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

interface DividendHistoryItem {
  dividendEventId: string;
  albumId: string;
  albumName: string;
  photoStorageId: string;
  photoStorageName: string;
  action: 'REINVEST' | 'RECEIVE';
  emoValueAtEvent: number;
  executedAt: string;
}

interface InsightFeatureProps {
  albumId: string;
}

const CHART_HEIGHT_BY_PERIOD: Record<Period, number> = {
  '1W': 340,
  '1M': 320,
  '3M': 300,
  '1Y': 270,
  ALL: 250,
};

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
  const [dividendHistory, setDividendHistory] = useState<DividendHistoryItem[]>(
    [],
  );
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  const fetchDividendHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/v1/dividend');
      if (!res.ok) return;
      const data = (await res.json()) as {
        completed?: DividendHistoryItem[];
      };
      const completed = data.completed ?? [];
      setDividendHistory(completed.filter((e) => e.albumId === albumId));
    } catch {
      setDividendHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [albumId]);

  useEffect(() => {
    fetchDividendHistory();
  }, [fetchDividendHistory]);

  function handleDividendComplete() {
    fetchInsight();
    fetchChart();
    fetchDividendHistory();
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
        events?: Array<{ id: string; photoStorageName?: string }>;
      } | null;
      if (body?.events?.length) {
        for (const ev of body.events) {
          if (ev.photoStorageName) {
            sendDividendReceivedNotification(ev.photoStorageName, ev.id).catch(
              () => {},
            );
          }
        }
        await fetchInsight();
        fetchDividendHistory();
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
        events?: Array<{ id: string; photoStorageName?: string }>;
      } | null;
      if (body?.events?.length) {
        for (const ev of body.events) {
          if (ev.photoStorageName) {
            sendDividendReceivedNotification(ev.photoStorageName, ev.id).catch(
              () => {},
            );
          }
        }
        await fetchInsight();
        fetchDividendHistory();
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

  const emoValueForDisplay = insight?.emoValueInfo.emoValue ?? 0;
  if (insight && emoValueForDisplay <= 0) {
    return (
      <div className="min-h-screen bg-background-light p-5">
        <div className="mx-auto max-w-md rounded-xl bg-white px-4 py-6 shadow-card text-center">
          <p className="text-sm text-gray-600">0 emo のため表示できません。</p>
          <Link
            href="/insight"
            className="mt-3 inline-block text-sm text-green underline"
          >
            インサイト一覧へ戻る
          </Link>
        </div>
      </div>
    );
  }

  const changeValue = insight?.emoValueInfo.dayOverDayChange.value ?? 0;
  const changePercent = insight?.emoValueInfo.dayOverDayChange.percentage ?? 0;
  const isPositive = changeValue >= 0;
  const chartHeight = CHART_HEIGHT_BY_PERIOD[period];

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
        <div className="min-h-[320px] rounded-xl bg-white px-4 py-4 shadow-card">
          <PeriodTabs selected={period} onChange={setPeriod} />
          <div className="mt-3 min-h-[250px]">
            <EmoChart
              data={chartData}
              loading={loadingChart}
              period={period}
              height={chartHeight}
            />
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

        {/* 配当受け取り履歴（ストレージごと） */}
        {insight && (
          <div className="rounded-xl bg-white px-4 py-3 shadow-card">
            <h2 className="text-[13px] font-medium text-gray-900">
              配当受け取り履歴
            </h2>
            {loadingHistory ? (
              <p className="mt-2 text-[13px] text-gray-500">読み込み中...</p>
            ) : dividendHistory.length === 0 ? (
              <p className="mt-2 text-[13px] text-gray-500">
                まだ履歴はありません。
              </p>
            ) : (
              <div className="mt-2 space-y-4 text-[13px]">
                {(() => {
                  const byStorage = new Map<
                    string,
                    { name: string; events: DividendHistoryItem[] }
                  >();
                  for (const e of dividendHistory) {
                    const cur = byStorage.get(e.photoStorageId);
                    if (cur) {
                      cur.events.push(e);
                    } else {
                      byStorage.set(e.photoStorageId, {
                        name: e.photoStorageName,
                        events: [e],
                      });
                    }
                  }
                  for (const [, v] of byStorage) {
                    v.events.sort(
                      (a, b) =>
                        new Date(b.executedAt).getTime() -
                        new Date(a.executedAt).getTime(),
                    );
                  }
                  return Array.from(byStorage.entries()).map(
                    ([storageId, { name, events }]) => (
                      <div key={storageId}>
                        <p className="font-medium text-gray-800">{name}</p>
                        <ul className="mt-1.5 space-y-1.5 pl-0">
                          {events.map((e) => (
                            <li
                              key={e.dividendEventId}
                              className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-1.5 last:border-0 last:pb-0 text-[12px]"
                            >
                              <span className="text-gray-600">
                                {new Date(e.executedAt).toLocaleDateString(
                                  'ja-JP',
                                )}{' '}
                                {e.action === 'RECEIVE' ? '受取' : '再投資'}・
                                {Math.round(e.emoValueAtEvent).toLocaleString()}{' '}
                                emo
                              </span>
                              <Link
                                href={`/dividend/${e.dividendEventId}`}
                                className="shrink-0 text-xs text-green underline"
                              >
                                詳細
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ),
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
