'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminEmoSection from '@/features/admin/AdminEmoSection';

type AdminOverviewResponse = {
  generatedAt: string;
  currentUser: {
    id: number;
    name: string;
    email: string;
    isRegisteredAdmin: boolean;
    isBootstrapAdmin: boolean;
  };
  systemAdministrators: Array<{
    id: string;
    userId: number;
    userName: string;
    userEmail: string;
    createdByUserId: number | null;
    createdByUserEmail: string | null;
    createdAt: string;
  }>;
  users: Array<{
    id: number;
    name: string;
    email: string;
    groupCount: number;
    groups: Array<{
      groupId: number;
      groupName: string;
      role: string;
      isGroupAdmin: boolean;
    }>;
  }>;
  groups: Array<{
    id: number;
    groupName: string;
    adminUser: {
      id: number;
      name: string;
      email: string;
    };
    memberCount: number;
    members: Array<{
      userId: number;
      userName: string;
      userEmail: string;
      role: string;
    }>;
  }>;
  albums: Array<{
    id: string;
    name: string;
    ownerUserId: string;
    rootPath: string;
    createdAt: string;
    photoStorageCount: number;
    totalPhotos: number;
    totalSizeBytes: number;
    photoStorages: Array<{
      id: string;
      name: string;
      photoCount: number;
      totalSizeBytes: number;
      createdAt: string;
    }>;
  }>;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('ja-JP').format(value);
}

export default function AdminFeature() {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [newSystemAdminUserId, setNewSystemAdminUserId] = useState('');
  const [adminManageMessage, setAdminManageMessage] = useState('');
  const [isMutatingAdmin, setIsMutatingAdmin] = useState(false);

  const fetchOverview = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/overview', { method: 'GET' });
      const payload = (await response.json().catch(() => ({}))) as
        | AdminOverviewResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          'error' in payload
            ? (payload.error ?? '管理データの取得に失敗しました')
            : '管理データの取得に失敗しました',
        );
      }

      setData(payload as AdminOverviewResponse);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : '管理データの取得に失敗しました',
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchOverview();
  }, []);

  const addSystemAdministrator = async () => {
    if (!newSystemAdminUserId.trim()) {
      setAdminManageMessage('追加対象の User ID を入力してください。');
      return;
    }

    setIsMutatingAdmin(true);
    setAdminManageMessage('');
    try {
      const response = await fetch('/api/admin/system-administrators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: Number(newSystemAdminUserId.trim()) }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.error ?? 'system administrator の追加に失敗しました',
        );
      }

      setNewSystemAdminUserId('');
      setAdminManageMessage('system administrator を追加しました。');
      await fetchOverview();
    } catch (mutateError) {
      setAdminManageMessage(
        mutateError instanceof Error
          ? mutateError.message
          : 'system administrator の追加に失敗しました',
      );
    } finally {
      setIsMutatingAdmin(false);
    }
  };

  const removeSystemAdministrator = async (userId: number) => {
    setIsMutatingAdmin(true);
    setAdminManageMessage('');
    try {
      const response = await fetch('/api/admin/system-administrators', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.error ?? 'system administrator の削除に失敗しました',
        );
      }

      setAdminManageMessage('system administrator を削除しました。');
      await fetchOverview();
    } catch (mutateError) {
      setAdminManageMessage(
        mutateError instanceof Error
          ? mutateError.message
          : 'system administrator の削除に失敗しました',
      );
    } finally {
      setIsMutatingAdmin(false);
    }
  };

  const summary = useMemo(() => {
    if (!data) {
      return null;
    }

    const memberships = data.users.reduce(
      (total, user) => total + user.groupCount,
      0,
    );

    const totalPhotoStorages = data.albums.reduce(
      (total, album) => total + album.photoStorageCount,
      0,
    );

    return {
      users: data.users.length,
      groups: data.groups.length,
      albums: data.albums.length,
      memberships,
      totalPhotoStorages,
    };
  }, [data]);

  const cardClass = 'rounded-xl bg-white shadow-card';
  const ghostButtonClass =
    'rounded-lg bg-light-gray px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50';
  const primaryButtonClass =
    'rounded-lg bg-green px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50';

  return (
    <div className="min-h-screen bg-background-light p-5">
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 pb-24 lg:max-w-6xl">
        <section className={`${cardClass} p-5`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">管理者インターフェース</h1>
              <p className="text-sm text-gray-500">
                ユーザー所属、グループ構成、アルバムとフォトストレージの紐づきを一覧表示します。
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/" className={ghostButtonClass}>
                Homeへ戻る
              </Link>
              <button
                type="button"
                onClick={() => void fetchOverview()}
                className={ghostButtonClass}
              >
                再読み込み
              </button>
            </div>
          </div>
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
            読み込み中...
          </section>
        ) : null}

        {!isLoading && data && summary ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <article className={`${cardClass} p-4`}>
                <div className="text-xs text-gray-500">Users</div>
                <div className="mt-1 text-2xl font-bold">{summary.users}</div>
              </article>
              <article className={`${cardClass} p-4`}>
                <div className="text-xs text-gray-500">Groups</div>
                <div className="mt-1 text-2xl font-bold">{summary.groups}</div>
              </article>
              <article className={`${cardClass} p-4`}>
                <div className="text-xs text-gray-500">Memberships</div>
                <div className="mt-1 text-2xl font-bold">
                  {summary.memberships}
                </div>
              </article>
              <article className={`${cardClass} p-4`}>
                <div className="text-xs text-gray-500">Albums</div>
                <div className="mt-1 text-2xl font-bold">{summary.albums}</div>
              </article>
              <article className={`${cardClass} p-4`}>
                <div className="text-xs text-gray-500">Photo Storages</div>
                <div className="mt-1 text-2xl font-bold">
                  {summary.totalPhotoStorages}
                </div>
              </article>
            </section>

            <section className={`${cardClass} p-4`}>
              <h2 className="text-lg font-semibold">
                System Administrator 管理
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                `/admin` へのアクセス権はこの一覧で管理されます。
              </p>
              <p className="mt-1 text-xs text-gray-500">
                現在のログインユーザー: #{data.currentUser.id}{' '}
                {data.currentUser.name} ({data.currentUser.email})
              </p>
              <p className="mt-1 text-xs text-gray-500">
                権限:
                {data.currentUser.isRegisteredAdmin
                  ? ' registered admin'
                  : data.currentUser.isBootstrapAdmin
                    ? ' bootstrap admin（初期登録専用）'
                    : ' none'}
              </p>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="number"
                  value={newSystemAdminUserId}
                  onChange={(event) =>
                    setNewSystemAdminUserId(event.target.value)
                  }
                  placeholder="User ID (例: 12)"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-green-600"
                />
                <button
                  type="button"
                  onClick={() => void addSystemAdministrator()}
                  disabled={isMutatingAdmin}
                  className={primaryButtonClass}
                >
                  追加
                </button>
              </div>

              {adminManageMessage ? (
                <p className="mt-2 text-sm">{adminManageMessage}</p>
              ) : null}

              <div className="mt-3 grid gap-2 md:hidden">
                {data.systemAdministrators.map((admin) => (
                  <article
                    key={admin.id}
                    className="rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <p className="text-xs text-gray-500">User ID</p>
                    <p className="text-sm font-semibold">#{admin.userId}</p>
                    <p className="mt-2 text-xs text-gray-500">User</p>
                    <p className="text-sm">
                      {admin.userName} ({admin.userEmail})
                    </p>
                    <p className="mt-2 text-xs text-gray-500">Created By</p>
                    <p className="text-xs font-mono">
                      {admin.createdByUserId
                        ? `#${admin.createdByUserId} (${admin.createdByUserEmail})`
                        : '-'}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">Created At</p>
                    <p className="text-xs">
                      {new Date(admin.createdAt).toLocaleString('ja-JP')}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void removeSystemAdministrator(admin.userId)
                      }
                      disabled={
                        isMutatingAdmin || !data.currentUser.isRegisteredAdmin
                      }
                      className="mt-3 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
                    >
                      削除
                    </button>
                  </article>
                ))}
              </div>
              <div className="mt-3 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-2 py-2">User ID</th>
                      <th className="px-2 py-2">User</th>
                      <th className="px-2 py-2">Created By</th>
                      <th className="px-2 py-2">Created At</th>
                      <th className="px-2 py-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.systemAdministrators.map((admin) => (
                      <tr key={admin.id} className="border-b border-gray-100">
                        <td className="px-2 py-2 text-xs">#{admin.userId}</td>
                        <td className="px-2 py-2 text-xs">
                          {admin.userName} ({admin.userEmail})
                        </td>
                        <td className="px-2 py-2 font-mono text-xs">
                          {admin.createdByUserId
                            ? `#${admin.createdByUserId} (${admin.createdByUserEmail})`
                            : '-'}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {new Date(admin.createdAt).toLocaleString('ja-JP')}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              void removeSystemAdministrator(admin.userId)
                            }
                            disabled={
                              isMutatingAdmin ||
                              !data.currentUser.isRegisteredAdmin
                            }
                            className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <article className={`${cardClass} p-4`}>
                <h2 className="text-lg font-semibold">
                  誰がどのグループに所属しているか
                </h2>
                <div className="mt-3 grid gap-2 md:hidden">
                  {data.users.map((user) => (
                    <article
                      key={user.id}
                      className="rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <p className="text-sm font-semibold">
                        {user.name}{' '}
                        <span className="text-xs font-normal text-gray-500">
                          (ID: {user.id})
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">所属グループ</p>
                        {user.groups.length === 0 ? (
                          <p className="text-sm text-gray-500">所属なし</p>
                        ) : (
                          <ul className="mt-1 space-y-1 text-sm">
                            {user.groups.map((group) => (
                              <li key={`${user.id}-${group.groupId}`}>
                                {group.groupName} ({group.role})
                                {group.isGroupAdmin ? ' / admin' : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                <div className="mt-3 hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-2 py-2">User</th>
                        <th className="px-2 py-2">Email</th>
                        <th className="px-2 py-2">所属グループ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.users.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-gray-100 align-top"
                        >
                          <td className="px-2 py-2">
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-gray-500">
                              ID: {user.id}
                            </div>
                          </td>
                          <td className="px-2 py-2">{user.email}</td>
                          <td className="px-2 py-2">
                            {user.groups.length === 0 ? (
                              <span className="text-gray-500">所属なし</span>
                            ) : (
                              <ul className="space-y-1">
                                {user.groups.map((group) => (
                                  <li key={`${user.id}-${group.groupId}`}>
                                    {group.groupName} ({group.role})
                                    {group.isGroupAdmin ? ' / admin' : ''}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className={`${cardClass} p-4`}>
                <h2 className="text-lg font-semibold">
                  グループごとのメンバー構成
                </h2>
                <div className="mt-3 grid gap-2 md:hidden">
                  {data.groups.map((group) => (
                    <article
                      key={group.id}
                      className="rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <p className="text-sm font-semibold">{group.groupName}</p>
                      <p className="text-xs text-gray-500">
                        ID: {group.id} / {group.memberCount} members
                      </p>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Admin</p>
                        <p className="text-sm">{group.adminUser.name}</p>
                        <p className="text-xs text-gray-500">
                          {group.adminUser.email}
                        </p>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Members</p>
                        <ul className="mt-1 space-y-1 text-sm">
                          {group.members.map((member) => (
                            <li key={`${group.id}-${member.userId}`}>
                              {member.userName} ({member.role})
                            </li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="mt-3 hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-2 py-2">Group</th>
                        <th className="px-2 py-2">Admin</th>
                        <th className="px-2 py-2">Members</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.groups.map((group) => (
                        <tr
                          key={group.id}
                          className="border-b border-gray-100 align-top"
                        >
                          <td className="px-2 py-2">
                            <div className="font-medium">{group.groupName}</div>
                            <div className="text-xs text-gray-500">
                              ID: {group.id} / {group.memberCount} members
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            {group.adminUser.name}
                            <div className="text-xs text-gray-500">
                              {group.adminUser.email}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <ul className="space-y-1">
                              {group.members.map((member) => (
                                <li key={`${group.id}-${member.userId}`}>
                                  {member.userName} ({member.role})
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

            <section className={`${cardClass} p-4`}>
              <h2 className="text-lg font-semibold">
                アルバムの所有者とフォトストレージ紐づき
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                album の所有者は現在 `Album.userId`（Auth0 subject
                文字列）として表示します。
              </p>
              <div className="mt-3 grid gap-2 md:hidden">
                {data.albums.map((album) => (
                  <article
                    key={album.id}
                    className="rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <p className="text-sm font-semibold">{album.name}</p>
                    <p className="text-xs text-gray-500">
                      root: {album.rootPath}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      Owner (`userId`)
                    </p>
                    <p className="font-mono text-xs">{album.ownerUserId}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <p>Storage数: {formatNumber(album.photoStorageCount)}</p>
                      <p>写真数: {formatNumber(album.totalPhotos)}</p>
                      <p className="col-span-2">
                        合計サイズ: {formatNumber(album.totalSizeBytes)} bytes
                      </p>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Storage一覧</p>
                      {album.photoStorages.length === 0 ? (
                        <p className="text-sm text-gray-500">なし</p>
                      ) : (
                        <ul className="mt-1 space-y-1 text-sm">
                          {album.photoStorages.map((storage) => (
                            <li key={storage.id}>
                              {storage.name} ({storage.photoCount}枚)
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
                      <th className="px-2 py-2">Owner (`userId`)</th>
                      <th className="px-2 py-2">PhotoStorage数</th>
                      <th className="px-2 py-2">合計写真数</th>
                      <th className="px-2 py-2">合計サイズ(bytes)</th>
                      <th className="px-2 py-2">Storage一覧</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.albums.map((album) => (
                      <tr
                        key={album.id}
                        className="border-b border-gray-100 align-top"
                      >
                        <td className="px-2 py-2">
                          <div className="font-medium">{album.name}</div>
                          <div className="text-xs text-gray-500">
                            root: {album.rootPath}
                          </div>
                        </td>
                        <td className="px-2 py-2 font-mono text-xs">
                          {album.ownerUserId}
                        </td>
                        <td className="px-2 py-2">
                          {formatNumber(album.photoStorageCount)}
                        </td>
                        <td className="px-2 py-2">
                          {formatNumber(album.totalPhotos)}
                        </td>
                        <td className="px-2 py-2">
                          {formatNumber(album.totalSizeBytes)}
                        </td>
                        <td className="px-2 py-2">
                          {album.photoStorages.length === 0 ? (
                            <span className="text-gray-500">なし</span>
                          ) : (
                            <ul className="space-y-1">
                              {album.photoStorages.map((storage) => (
                                <li key={storage.id}>
                                  {storage.name} ({storage.photoCount}枚)
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <AdminEmoSection />
          </>
        ) : null}
      </main>
    </div>
  );
}
