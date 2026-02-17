'use client';

import { FormEvent, useState } from 'react';

const isPwaStandalone = () => {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
};

export default function Home() {
  const [input, setInput] = useState(
    'Mastra をローカルで動かす最小セットを教えて',
  );
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notificationMessage, setNotificationMessage] =
    useState('通知テストを送信しました。');

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('このブラウザは Notification API に対応していません。');
      return false;
    }

    if (Notification.permission === 'granted') return true;

    if (Notification.permission === 'denied') {
      alert('通知がブロックされています。ブラウザ設定から許可してください。');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const notifyFromBrowser = (body: string) => {
    const notification = new Notification('Web通知 (ブラウザ)', {
      body,
      icon: '/next.svg',
      badge: '/next.svg',
    });

    notification.onclick = () => {
      window.focus();
    };
  };

  const notifyFromServiceWorker = async (body: string) => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      alert('Service Worker が利用できないため、PWA通知を送信できません。');
      return;
    }

    const registration =
      (await navigator.serviceWorker.getRegistration('/')) ||
      (await navigator.serviceWorker.register('/push-sw.js'));

    const readyRegistration = registration.active
      ? registration
      : await navigator.serviceWorker.ready;

    readyRegistration.active?.postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: {
        title: 'PWA通知 (Service Worker)',
        options: {
          body,
          icon: '/next.svg',
          badge: '/next.svg',
          data: { url: '/' },
        },
      },
    });
  };

  const onClickTestNotification = async () => {
    const isGranted = await requestNotificationPermission();
    if (!isGranted) return;

    if (isPwaStandalone()) {
      await notifyFromServiceWorker(notificationMessage);
      return;
    }

    notifyFromBrowser(notificationMessage);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim()) return;

    setOutput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}));
        setOutput(payload.error ?? 'stream failed');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-bold">Mastra Stream Chat (Local MVP)</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        OPENAI_API_KEY が未設定でもモックで stream 表示できます。
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-28 rounded border border-zinc-300 p-3"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-fit rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isLoading ? 'Streaming...' : 'Send'}
        </button>
      </form>

      <section className="rounded border border-zinc-300 p-4">
        <h2 className="mb-2 font-semibold">Response</h2>
        <pre className="whitespace-pre-wrap text-sm">
          {output || '（ここにストリーム結果が表示されます）'}
        </pre>
      </section>

      <section className="rounded border border-zinc-300 p-4">
        <h2 className="mb-2 font-semibold">
          通知テスト（通常Web / PWA Push切替）
        </h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
          通常ブラウザでは Web通知、PWA standalone では Service Worker
          経由の通知を送信します。
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={notificationMessage}
            onChange={(e) => setNotificationMessage(e.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2"
            placeholder="通知本文"
          />
          <button
            type="button"
            onClick={onClickTestNotification}
            className="w-fit rounded bg-zinc-800 px-4 py-2 text-white"
          >
            通知テスト
          </button>
        </div>
      </section>
    </main>
  );
}
