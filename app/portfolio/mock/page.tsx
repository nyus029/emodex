'use client';

import Image from 'next/image';
import { useState } from 'react';

const mockUsers = [
  { id: 1, name: '名前' },
  { id: 2, name: '仲良し4人組' },
  { id: 3, name: '家族' },
  { id: 4, name: '友人' },
  { id: 5, name: '海めぐり' },
  { id: 6, name: 'カフェ' },
  { id: 7, name: '旅行' },
  { id: 8, name: '朝のお散歩' },
  { id: 9, name: 'いぬ' },
  { id: 10, name: 'その他' },
];

type AddedMember = {
  id: string;
  name: string;
  email: string;
};

export default function PortfolioPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState<AddedMember[]>([]);

  function resetModal() {
    setIsModalOpen(false);
    setGroupName('');
    setMemberEmail('');
    setMembers([]);
  }

  function handleAddMember() {
    const email = memberEmail.trim();
    if (!email || members.some((member) => member.email === email)) return;

    const userName = email.split('@')[0] || 'ユーザー';
    setMembers((prev) => [
      ...prev,
      { id: `${email}-${prev.length}`, name: userName, email },
    ]);
    setMemberEmail('');
  }

  function handleRemoveMember(memberId: string) {
    setMembers((prev) => prev.filter((member) => member.id !== memberId));
  }

  const canAddMember = memberEmail.trim().length > 0;
  const canCreate = groupName.trim().length > 0;

  return (
    <div className="min-h-screen bg-background-light p-5">
      <div className="mx-auto flex h-[calc(100svh-40px)] max-w-md flex-col overflow-hidden">
        <div className="shrink-0 border-b border-gray-300 pb-3 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-black">Groups</p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
            >
              作成
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {mockUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 rounded-xl bg-white p-4 shadow-card"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-light-gray">
                <svg className="h-4 w-4" viewBox="0 0 24 24" />
              </div>
              <div className="font-medium text-gray-800">{user.name}</div>
            </div>
          ))}
        </div>
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
                    追加
                  </button>
                </div>
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
                            src="/avatar.svg"
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
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-base leading-none text-gray hover:bg-red-50"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button
                  type="button"
                  disabled={!canCreate}
                  className="inline-flex h-[42px] w-full items-center justify-center rounded-lg bg-green px-4 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  作成
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
