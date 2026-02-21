'use client';

import Image from 'next/image';
import { useState } from 'react';

type PortfolioItem = {
  id: number;
  name: string;
  adminUserId: number;
};

type AddedMember = {
  id: string;
  name: string;
  email: string;
  picture: string | null;
};

type CreateGroupResponse = {
  groupId: number;
  groupName: string;
  adminUserId: number;
};

type ErrorResponse = {
  error?: string;
};

type VerifyUserResponse = {
  exists: boolean;
  user: {
    name: string;
    picture: string | null;
  } | null;
};

type GroupMember = {
  userId: number;
  email: string;
  role: 'ADMIN' | 'MEMBER';
};

interface PortfolioClientProps {
  initialGroups: PortfolioItem[];
  userId: number | null;
  isLoggedIn: boolean;
}

export default function PortfolioClient({
  initialGroups,
  userId,
  isLoggedIn,
}: PortfolioClientProps) {
  const [groups, setGroups] = useState<PortfolioItem[]>(initialGroups);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState<AddedMember[]>([]);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [isVerifyingMember, setIsVerifyingMember] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [editMembers, setEditMembers] = useState<GroupMember[]>([]);
  const [isLoadingEditMembers, setIsLoadingEditMembers] = useState(false);
  const [editMemberEmail, setEditMemberEmail] = useState('');
  const [editMemberError, setEditMemberError] = useState<string | null>(null);
  const [isAddingEditMember, setIsAddingEditMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  function resetModal() {
    setIsModalOpen(false);
    setGroupName('');
    setMemberEmail('');
    setMembers([]);
    setMemberError(null);
    setIsVerifyingMember(false);
    setSubmitError(null);
    setIsSubmitting(false);
  }

  async function loadEditMembers(groupId: number) {
    if (!userId) return;
    setIsLoadingEditMembers(true);
    setEditMemberError(null);
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        headers: { 'x-user-id': String(userId) },
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ErrorResponse;
        throw new Error(body.error ?? 'メンバー一覧の取得に失敗しました');
      }

      const body = (await response.json()) as GroupMember[];
      setEditMembers(body);
    } catch (error) {
      setEditMemberError(
        error instanceof Error
          ? error.message
          : 'メンバー一覧の取得に失敗しました',
      );
    } finally {
      setIsLoadingEditMembers(false);
    }
  }

  function openEditModal(group: PortfolioItem) {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
    setEditError(null);
    setIsUpdatingGroup(false);
    setEditMembers([]);
    setEditMemberEmail('');
    setEditMemberError(null);
    setIsAddingEditMember(false);
    setRemovingMemberId(null);
    setIsDeletingGroup(false);
    setIsEditModalOpen(true);
    void loadEditMembers(group.id);
  }

  function resetEditModal() {
    setIsEditModalOpen(false);
    setEditingGroupId(null);
    setEditingGroupName('');
    setEditError(null);
    setIsUpdatingGroup(false);
    setEditMembers([]);
    setIsLoadingEditMembers(false);
    setEditMemberEmail('');
    setEditMemberError(null);
    setIsAddingEditMember(false);
    setRemovingMemberId(null);
    setIsDeletingGroup(false);
  }

  async function handleAddMember() {
    const email = memberEmail.trim().toLowerCase();
    if (!email || members.some((member) => member.email === email)) return;

    setMemberError(null);
    setIsVerifyingMember(true);
    try {
      const response = await fetch(
        `/api/users/verify/${encodeURIComponent(email)}`,
      );
      if (!response.ok) {
        throw new Error('ユーザー確認に失敗しました');
      }

      const body = (await response.json()) as VerifyUserResponse;
      if (!body.exists || !body.user) {
        setMemberError('該当するユーザーが見つかりません');
        return;
      }

      const verifiedUser = body.user;
      setMembers((prev) => [
        ...prev,
        {
          id: `${email}-${prev.length}`,
          name: verifiedUser.name,
          email,
          picture: verifiedUser.picture,
        },
      ]);
      setMemberEmail('');
    } catch (error) {
      setMemberError(
        error instanceof Error ? error.message : 'ユーザー確認に失敗しました',
      );
    } finally {
      setIsVerifyingMember(false);
    }
  }

  function handleRemoveMember(memberId: string) {
    setMembers((prev) => prev.filter((member) => member.id !== memberId));
  }

  async function handleCreateGroup() {
    if (!userId) {
      setSubmitError('ユーザー情報を取得できないため作成できません');
      return;
    }

    const trimmedName = groupName.trim();
    if (!trimmedName) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload: {
        groupName: string;
        memberEmails: string[];
      } = {
        groupName: trimmedName,
        memberEmails: members.map((member) => member.email),
      };

      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(userId),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ErrorResponse;
        throw new Error(body.error ?? 'グループの作成に失敗しました');
      }

      const created = (await res.json()) as CreateGroupResponse;
      setGroups((prev) => [
        ...prev,
        {
          id: created.groupId,
          name: created.groupName,
          adminUserId: created.adminUserId,
        },
      ]);
      resetModal();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'グループの作成に失敗しました',
      );
      setIsSubmitting(false);
    }
  }

  async function handleUpdateGroup() {
    if (!userId || !editingGroupId) {
      setEditError('ユーザー情報を取得できないため編集できません');
      return;
    }

    const trimmedName = editingGroupName.trim();
    if (!trimmedName) {
      setEditError('グループ名を入力してください');
      return;
    }

    setEditError(null);
    setIsUpdatingGroup(true);
    try {
      const res = await fetch(`/api/groups/${editingGroupId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(userId),
        },
        body: JSON.stringify({ groupName: trimmedName }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ErrorResponse;
        throw new Error(body.error ?? 'グループの編集に失敗しました');
      }

      setGroups((prev) =>
        prev.map((group) =>
          group.id === editingGroupId ? { ...group, name: trimmedName } : group,
        ),
      );
      resetEditModal();
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : 'グループの編集に失敗しました',
      );
      setIsUpdatingGroup(false);
    }
  }

  async function handleAddMemberToGroup() {
    if (!userId || !editingGroupId) {
      setEditMemberError('ユーザー情報を取得できないため追加できません');
      return;
    }

    const email = editMemberEmail.trim().toLowerCase();
    if (!email) return;
    if (editMembers.some((member) => member.email === email)) {
      setEditMemberError('このユーザーは既に追加されています');
      return;
    }

    setEditMemberError(null);
    setIsAddingEditMember(true);
    try {
      const verifyRes = await fetch(
        `/api/users/verify/${encodeURIComponent(email)}`,
      );
      if (!verifyRes.ok) {
        throw new Error('ユーザー確認に失敗しました');
      }
      const verifyBody = (await verifyRes.json()) as VerifyUserResponse;
      if (!verifyBody.exists) {
        setEditMemberError('該当するユーザーが見つかりません');
        return;
      }

      const addRes = await fetch(`/api/groups/${editingGroupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(userId),
        },
        body: JSON.stringify({ email }),
      });

      if (!addRes.ok) {
        const body = (await addRes.json().catch(() => ({}))) as ErrorResponse;
        throw new Error(body.error ?? 'メンバー追加に失敗しました');
      }

      const added = (await addRes.json()) as {
        userId: number;
        role: GroupMember['role'];
      };
      setEditMembers((prev) => [
        ...prev,
        { userId: added.userId, email, role: added.role },
      ]);
      setEditMemberEmail('');
    } catch (error) {
      setEditMemberError(
        error instanceof Error ? error.message : 'メンバー追加に失敗しました',
      );
    } finally {
      setIsAddingEditMember(false);
    }
  }

  async function handleRemoveMemberFromGroup(member: GroupMember) {
    if (!userId || !editingGroupId || member.role === 'ADMIN') return;

    setEditMemberError(null);
    setRemovingMemberId(member.userId);
    try {
      const res = await fetch(
        `/api/groups/${editingGroupId}/members/${member.userId}`,
        {
          method: 'DELETE',
          headers: {
            'x-user-id': String(userId),
          },
        },
      );

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ErrorResponse;
        throw new Error(body.error ?? 'メンバー削除に失敗しました');
      }

      setEditMembers((prev) => prev.filter((m) => m.userId !== member.userId));
    } catch (error) {
      setEditMemberError(
        error instanceof Error ? error.message : 'メンバー削除に失敗しました',
      );
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function handleDeleteGroup() {
    if (!userId || !editingGroupId) {
      setEditError('ユーザー情報を取得できないため削除できません');
      return;
    }

    if (
      !window.confirm(
        'このグループを削除します。グループとメンバー紐付けは元に戻せません。よろしいですか？',
      )
    ) {
      return;
    }

    setEditError(null);
    setIsDeletingGroup(true);
    try {
      const res = await fetch(`/api/groups/${editingGroupId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': String(userId),
        },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ErrorResponse;
        throw new Error(body.error ?? 'グループ削除に失敗しました');
      }

      setGroups((prev) => prev.filter((group) => group.id !== editingGroupId));
      resetEditModal();
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : 'グループ削除に失敗しました',
      );
      setIsDeletingGroup(false);
    }
  }

  const canAddMember = memberEmail.trim().length > 0 && !isVerifyingMember;
  const canCreate = groupName.trim().length > 0 && !isSubmitting;
  const canUpdateGroup =
    editingGroupName.trim().length > 0 && !isUpdatingGroup && !!editingGroupId;
  const canAddEditMember =
    editMemberEmail.trim().length > 0 &&
    !isAddingEditMember &&
    !!editingGroupId;

  return (
    <div className="min-h-screen bg-background-light p-5">
      <div className="mx-auto max-w-md space-y-4 pb-24">
        <div className="rounded-xl bg-white px-4 py-3 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-black">Groups</p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={!isLoggedIn}
              className="inline-flex items-center rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              作成
            </button>
          </div>
        </div>

        {!isLoggedIn ? (
          <div className="rounded-xl bg-white p-4 text-sm text-gray-700 shadow-card">
            ログイン後にグループ一覧を表示できます。
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl bg-white p-4 text-sm text-gray-700 shadow-card">
            表示できるグループがありません。
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) =>
              group.adminUserId === userId ? (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => openEditModal(group)}
                  className="flex w-full items-center gap-2 rounded-xl bg-white p-4 text-left shadow-card transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-light-gray">
                    <Image
                      src="/avatar.svg"
                      alt="avatar"
                      width={16}
                      height={16}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="font-medium text-gray-800">{group.name}</div>
                </button>
              ) : (
                <div
                  key={group.id}
                  className="flex items-center gap-2 rounded-xl bg-white p-4 shadow-card"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-light-gray">
                    <Image
                      src="/avatar.svg"
                      alt="avatar"
                      width={16}
                      height={16}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="font-medium text-gray-800">{group.name}</div>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px] sm:p-5"
          onClick={resetModal}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <p className="text-base font-semibold text-gray-800">
                グループを新規作成
              </p>
              <button
                type="button"
                onClick={resetModal}
                aria-label="閉じる"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none text-black hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 px-5 py-4">
              <div className="space-y-1">
                <label
                  htmlFor="group-name"
                  className="text-sm font-semibold text-gray-700"
                >
                  グループ名
                </label>
                <input
                  id="group-name"
                  type="text"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-green-600"
                  placeholder="グループ名を入力"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="member-email"
                  className="text-sm font-semibold text-gray-700"
                >
                  メンバー追加（メールアドレス）
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="member-email"
                    type="email"
                    value={memberEmail}
                    onChange={(event) => setMemberEmail(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddMember();
                      }
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-green-600"
                    placeholder="sample@example.com"
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={!canAddMember}
                    className="h-[42px] shrink-0 rounded-lg bg-green px-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isVerifyingMember ? '確認中...' : '追加'}
                  </button>
                </div>
                {memberError ? (
                  <p className="text-sm text-red-600">{memberError}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">
                  追加済みユーザー
                </p>
                <div className="max-h-44 space-y-2 overflow-auto rounded-lg border border-gray-200 bg-gray-50/60 p-2">
                  {members.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-gray-500">
                      まだ追加されていません
                    </p>
                  ) : (
                    members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 shadow-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Image
                            src={member.picture || '/avatar.svg'}
                            alt="avatar"
                            width={24}
                            height={24}
                            className="h-6 w-6 shrink-0"
                          />
                          <span className="truncate text-sm text-gray-800">
                            {member.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          aria-label="ユーザーを削除"
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-base leading-none text-black hover:bg-red-50"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {submitError ? (
                <p className="text-sm text-red-600">{submitError}</p>
              ) : null}

              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={!canCreate}
                  className="inline-flex h-[42px] w-full items-center justify-center rounded-lg bg-green px-4 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isSubmitting ? '作成中...' : '作成'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isEditModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px] sm:p-5"
          onClick={resetEditModal}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <p className="text-base font-semibold text-gray-800">
                グループを編集
              </p>
              <button
                type="button"
                onClick={resetEditModal}
                aria-label="閉じる"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none text-black hover:bg-gray-100"
              >
                ×
              </button>
            </div>
            <div className="space-y-5 px-5 py-4">
              <div className="space-y-1">
                <label
                  htmlFor="edit-group-name"
                  className="text-sm font-semibold text-gray-700"
                >
                  グループ名
                </label>
                <input
                  id="edit-group-name"
                  type="text"
                  value={editingGroupName}
                  onChange={(event) => setEditingGroupName(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-green-600"
                  placeholder="グループ名を入力"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">
                  メンバー追加（メールアドレス）
                </p>
                <div className="flex items-center gap-2">
                  <input
                    id="edit-member-email"
                    type="email"
                    value={editMemberEmail}
                    onChange={(event) => setEditMemberEmail(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleAddMemberToGroup();
                      }
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-green-600"
                    placeholder="sample@example.com"
                  />
                  <button
                    type="button"
                    onClick={handleAddMemberToGroup}
                    disabled={!canAddEditMember}
                    className="h-[42px] shrink-0 rounded-lg bg-green px-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAddingEditMember ? '確認中...' : '追加'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">
                  メンバー一覧
                </p>
                <div className="max-h-44 space-y-2 overflow-auto rounded-lg border border-gray-200 bg-gray-50/60 p-2">
                  {isLoadingEditMembers ? (
                    <p className="px-1 py-2 text-sm text-gray-500">
                      読み込み中...
                    </p>
                  ) : editMembers.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-gray-500">
                      メンバーがいません
                    </p>
                  ) : (
                    editMembers.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 shadow-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-gray-800">
                            {member.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            {member.role === 'ADMIN' ? 'リーダー' : 'メンバー'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMemberFromGroup(member)}
                          disabled={
                            member.role === 'ADMIN' ||
                            removingMemberId === member.userId
                          }
                          className="inline-flex h-7 w-12 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-black hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {removingMemberId === member.userId
                            ? '削除中'
                            : '削除'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {editMemberError ? (
                <p className="text-sm text-red-600">{editMemberError}</p>
              ) : null}
              {editError ? (
                <p className="text-sm text-red-600">{editError}</p>
              ) : null}
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={handleDeleteGroup}
                  disabled={isDeletingGroup || isUpdatingGroup}
                  className="inline-flex h-[42px] items-center justify-center rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeletingGroup ? '削除中...' : 'グループ削除'}
                </button>
                <button
                  type="button"
                  onClick={handleUpdateGroup}
                  disabled={!canUpdateGroup || isDeletingGroup}
                  className="inline-flex h-[42px] w-full items-center justify-center rounded-lg bg-green px-4 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isUpdatingGroup ? '更新中...' : '更新'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
