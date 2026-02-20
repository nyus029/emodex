'use client';

import LoginButton from '@/components/auth/LoginButton';
import LogoutButton from '@/components/auth/LogoutButton';
import Profile from '@/components/auth/Profile';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect } from 'react';

export default function AuthTestSetComponent() {
  const { user, isLoading } = useUser();

  useEffect(() => {
    console.log('ユーザーデータ:', user);
  }, [user]);

  return (
    <main className="auth-test">
      <h1 className="auth-test-title">Auth0 コンポーネント試用</h1>
      <p className="auth-test-desc">
        ログイン・ログアウトとプロフィール表示の動作確認用です。
      </p>
      {isLoading && <p className="auth-test-loading">認証状態を取得中...</p>}
      <p>{JSON.stringify(user)}</p>
      console.log('ユーザーデータ:', user);
      {!isLoading && !user && (
        <section className="auth-test-section">
          <h2>未ログイン</h2>
          <LoginButton />
        </section>
      )}
      {!isLoading && user && (
        <section className="auth-test-section">
          <h2>ログイン済み</h2>
          <Profile />
          <div className="auth-test-actions">
            <LogoutButton />
          </div>
        </section>
      )}
    </main>
  );
}
