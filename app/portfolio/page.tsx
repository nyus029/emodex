import React from 'react';

const mockUsers = [
  { id: 1, name: '名前' },
  { id: 2, name: '仲良し4人組' },
  { id: 3, name: '家族' },
  { id: 4, name: '友人' },
];

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-background-light p-5">
      <div className="max-w-md mx-auto space-y-4">
        {mockUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-2 bg-white  rounded-xl shadow-card p-4"
          >
            {/* ユーザーアイコン（削除可能） */}
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-light-gray">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                {/* User Icon */}
              </svg>
            </div>

            <div className="text-gray-800 font-medium">{user.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
