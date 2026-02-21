'use client';

import { useEffect, useState } from 'react';

type PhotoStorageEmo = {
  id: string;
  name: string;
  photoCount: number;
  baseEmoPerPhoto: number;
  compoundStartDate: string;
  isCompoundActive: boolean;
  currentEmoValue: number;
};

type AlbumEmo = {
  id: string;
  name: string;
  currentEmoValue: number;
  dayOverDayChange: { value: number; percentage: number };
  photoStorages: PhotoStorageEmo[];
};

type SnapshotRow = {
  photoStorageId: string;
  photoStorageName: string;
  albumName: string;
  snapshotDate: string;
  emoValue: number;
};

type DividendEventRow = {
  id: string;
  albumName: string;
  photoStorageName: string;
  action: 'REINVEST' | 'RECEIVE';
  emoValueAtEvent: number;
  previousBaseEmo: number;
  newBaseEmo: number;
  executedAt: string;
};

type EmoOverviewResponse = {
  generatedAt: string;
  totalEmoValue: number;
  albums: AlbumEmo[];
  recentSnapshots: SnapshotRow[];
  recentDividendEvents: DividendEventRow[];
};

function formatEmo(value: number) {
  return new Intl.NumberFormat('ja-JP', {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function AdminEmoSection() {
  const [data, setData] = useState<EmoOverviewResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [triggerMessage, setTriggerMessage] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchEmoOverview = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/emo-overview', {
        method: 'GET',
      });
      const payload = (await response.json().catch(() => ({}))) as
        | EmoOverviewResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          'error' in payload
            ? (payload.error ?? 'エモ価データの取得に失敗しました')
            : 'エモ価データの取得に失敗しました',
        );
      }

      setData(payload as EmoOverviewResponse);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'エモ価データの取得に失敗しました',
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSnapshots = async () => {
    setIsTriggering(true);
    setTriggerMessage('');
    try {
      const response = await fetch('/api/admin/emo-snapshots/trigger', {
        method: 'POST',
      });
      const payload = (await response.json().catch(() => ({}))) as {
        snapshotsUpserted?: number;
        date?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? 'スナップショット実行に失敗しました');
      }

      setTriggerMessage(
        `${payload.date} のスナップショットを ${payload.snapshotsUpserted} 件作成しました。`,
      );
      await fetchEmoOverview();
    } catch (triggerError) {
      setTriggerMessage(
        triggerError instanceof Error
          ? triggerError.message
          : 'スナップショット実行に失敗しました',
      );
    } finally {
      setIsTriggering(false);
    }
  };

  useEffect(() => {
    void fetchEmoOverview();
  }, []);

  const activeAlbumCount = data
    ? data.albums.filter((a) => a.photoStorages.some((s) => s.isCompoundActive))
        .length
    : 0;

  const cardClass = 'rounded-xl bg-white shadow-card';
  const ghostButtonClass =
    'rounded-lg bg-light-gray px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50';
  const primaryButtonClass =
    'rounded-lg bg-green px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50';

  return (
    <>
      <section className={`${cardClass} p-4`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">エモ価モニタリング</h2>
            <p className="mt-1 text-xs text-gray-500">
              全アルバムのエモ価状況、スナップショット、配当イベントを確認できます。
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void triggerSnapshots()}
              disabled={isTriggering}
              className={primaryButtonClass}
            >
              {isTriggering ? '実行中...' : 'スナップショット実行'}
            </button>
            <button
              type="button"
              onClick={() => void fetchEmoOverview()}
              className={ghostButtonClass}
            >
              再読み込み
            </button>
          </div>
        </div>
        {triggerMessage ? (
          <p className="mt-2 text-sm">{triggerMessage}</p>
        ) : null}
        {data ? (
          <p className="mt-3 text-xs text-gray-500">
            最終取得: {new Date(data.generatedAt).toLocaleString('ja-JP')}
          </p>
        ) : null}
      </section>

      {error ? (
        <section className="rounded-xl bg-red-50 p-4 text-sm text-red-600 shadow-card">
          {error}
        </section>
      ) : null}

      {isLoading ? (
        <section className={`${cardClass} p-4 text-sm text-gray-500`}>
          エモ価データ読み込み中...
        </section>
      ) : null}

      {!isLoading && data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <article className={`${cardClass} p-4`}>
              <div className="text-xs text-gray-500">全体エモ価</div>
              <div className="mt-1 text-2xl font-bold">
                {formatEmo(data.totalEmoValue)}
              </div>
            </article>
            <article className={`${cardClass} p-4`}>
              <div className="text-xs text-gray-500">アクティブアルバム数</div>
              <div className="mt-1 text-2xl font-bold">{activeAlbumCount}</div>
            </article>
          </section>

          <section className={`${cardClass} p-4`}>
            <h3 className="text-base font-semibold">アルバム別エモ価</h3>
            <div className="mt-3 grid gap-2 md:hidden">
              {data.albums.map((album) => (
                <article
                  key={album.id}
                  className="rounded-lg border border-gray-200 bg-white p-3"
                >
                  <p className="text-sm font-semibold">{album.name}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <p className="text-gray-500">現在エモ価</p>
                    <p className="text-right">
                      {formatEmo(album.currentEmoValue)}
                    </p>
                    <p className="text-gray-500">前日比</p>
                    <p
                      className={`text-right ${
                        album.dayOverDayChange.value >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {album.dayOverDayChange.value >= 0 ? '+' : ''}
                      {formatEmo(album.dayOverDayChange.value)} (
                      {album.dayOverDayChange.percentage >= 0 ? '+' : ''}
                      {album.dayOverDayChange.percentage}%)
                    </p>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Storage一覧</p>
                    {album.photoStorages.length === 0 ? (
                      <p className="text-sm text-gray-500">なし</p>
                    ) : (
                      <ul className="mt-1 space-y-1 text-sm">
                        {album.photoStorages.map((s) => (
                          <li key={s.id}>
                            {s.name} / {s.photoCount}枚 / base{' '}
                            {s.baseEmoPerPhoto} /
                            {s.isCompoundActive ? ' ON' : ' OFF'} /{' '}
                            {formatEmo(s.currentEmoValue)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-2 py-2">Album</th>
                    <th className="px-2 py-2 text-right">現在エモ価</th>
                    <th className="px-2 py-2 text-right">前日比</th>
                    <th className="px-2 py-2">Storage一覧</th>
                  </tr>
                </thead>
                <tbody>
                  {data.albums.map((album) => (
                    <tr
                      key={album.id}
                      className="border-b border-gray-100 align-top"
                    >
                      <td className="px-2 py-2 font-medium">{album.name}</td>
                      <td className="px-2 py-2 text-right">
                        {formatEmo(album.currentEmoValue)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span
                          className={
                            album.dayOverDayChange.value >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {album.dayOverDayChange.value >= 0 ? '+' : ''}
                          {formatEmo(album.dayOverDayChange.value)} (
                          {album.dayOverDayChange.percentage >= 0 ? '+' : ''}
                          {album.dayOverDayChange.percentage}%)
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        {album.photoStorages.length === 0 ? (
                          <span className="text-gray-500">なし</span>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="px-1 py-1">名前</th>
                                <th className="px-1 py-1 text-right">枚数</th>
                                <th className="px-1 py-1 text-right">
                                  baseEmo
                                </th>
                                <th className="px-1 py-1">開始日</th>
                                <th className="px-1 py-1">Active</th>
                                <th className="px-1 py-1 text-right">エモ価</th>
                              </tr>
                            </thead>
                            <tbody>
                              {album.photoStorages.map((s) => (
                                <tr
                                  key={s.id}
                                  className="border-b border-gray-100 last:border-0"
                                >
                                  <td className="px-1 py-1">{s.name}</td>
                                  <td className="px-1 py-1 text-right">
                                    {s.photoCount}
                                  </td>
                                  <td className="px-1 py-1 text-right">
                                    {s.baseEmoPerPhoto}
                                  </td>
                                  <td className="px-1 py-1">
                                    {s.compoundStartDate.split('T')[0]}
                                  </td>
                                  <td className="px-1 py-1">
                                    {s.isCompoundActive ? (
                                      <span className="text-green-600">ON</span>
                                    ) : (
                                      <span className="text-gray-400">OFF</span>
                                    )}
                                  </td>
                                  <td className="px-1 py-1 text-right">
                                    {formatEmo(s.currentEmoValue)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={`${cardClass} p-4`}>
            <h3 className="text-base font-semibold">
              直近 EmoSnapshot（7日分）
            </h3>
            {data.recentSnapshots.length === 0 ? (
              <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 md:hidden">
                スナップショットデータがありません
              </div>
            ) : (
              <div className="mt-3 grid gap-2 md:hidden">
                {data.recentSnapshots.map((s, i) => (
                  <article
                    key={`${s.photoStorageId}-${s.snapshotDate}-${i}`}
                    className="rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <p className="text-sm font-semibold">{s.snapshotDate}</p>
                    <p className="text-sm">{s.albumName}</p>
                    <p className="text-xs text-gray-500">
                      {s.photoStorageName}
                    </p>
                    <p className="mt-1 text-sm">
                      エモ価: {formatEmo(s.emoValue)}
                    </p>
                  </article>
                ))}
              </div>
            )}
            <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-2 py-2">日付</th>
                    <th className="px-2 py-2">Album</th>
                    <th className="px-2 py-2">Storage</th>
                    <th className="px-2 py-2 text-right">エモ価</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSnapshots.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-2 py-4 text-center text-gray-500"
                      >
                        スナップショットデータがありません
                      </td>
                    </tr>
                  ) : (
                    data.recentSnapshots.map((s, i) => (
                      <tr
                        key={`${s.photoStorageId}-${s.snapshotDate}-${i}`}
                        className="border-b border-gray-100"
                      >
                        <td className="px-2 py-2">{s.snapshotDate}</td>
                        <td className="px-2 py-2">{s.albumName}</td>
                        <td className="px-2 py-2">{s.photoStorageName}</td>
                        <td className="px-2 py-2 text-right">
                          {formatEmo(s.emoValue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className={`${cardClass} p-4`}>
            <h3 className="text-base font-semibold">DividendEvent 履歴</h3>
            {data.recentDividendEvents.length === 0 ? (
              <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 md:hidden">
                配当イベントデータがありません
              </div>
            ) : (
              <div className="mt-3 grid gap-2 md:hidden">
                {data.recentDividendEvents.map((e) => (
                  <article
                    key={e.id}
                    className="rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <p className="text-sm font-semibold">
                      {new Date(e.executedAt).toLocaleString('ja-JP')}
                    </p>
                    <p className="text-sm">{e.albumName}</p>
                    <p className="text-xs text-gray-500">
                      {e.photoStorageName}
                    </p>
                    <p className="mt-1 text-sm">
                      Action:{' '}
                      <span
                        className={
                          e.action === 'REINVEST'
                            ? 'rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800'
                            : 'rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800'
                        }
                      >
                        {e.action}
                      </span>
                    </p>
                    <p className="mt-1 text-sm">
                      エモ価: {formatEmo(e.emoValueAtEvent)} / Base:{' '}
                      {e.previousBaseEmo} → {e.newBaseEmo}
                    </p>
                  </article>
                ))}
              </div>
            )}
            <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-2 py-2">実行日</th>
                    <th className="px-2 py-2">Album</th>
                    <th className="px-2 py-2">Storage</th>
                    <th className="px-2 py-2">アクション</th>
                    <th className="px-2 py-2 text-right">エモ価</th>
                    <th className="px-2 py-2 text-right">旧Base</th>
                    <th className="px-2 py-2 text-right">新Base</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentDividendEvents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-2 py-4 text-center text-gray-500"
                      >
                        配当イベントデータがありません
                      </td>
                    </tr>
                  ) : (
                    data.recentDividendEvents.map((e) => (
                      <tr key={e.id} className="border-b border-gray-100">
                        <td className="px-2 py-2">
                          {new Date(e.executedAt).toLocaleString('ja-JP')}
                        </td>
                        <td className="px-2 py-2">{e.albumName}</td>
                        <td className="px-2 py-2">{e.photoStorageName}</td>
                        <td className="px-2 py-2">
                          <span
                            className={
                              e.action === 'REINVEST'
                                ? 'rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800'
                                : 'rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800'
                            }
                          >
                            {e.action}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatEmo(e.emoValueAtEvent)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {e.previousBaseEmo}
                        </td>
                        <td className="px-2 py-2 text-right">{e.newBaseEmo}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
