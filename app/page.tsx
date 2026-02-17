'use client';

import { FormEvent, useState } from 'react';

export default function Home() {
  const [input, setInput] = useState(
    'Mastra をローカルで動かす最小セットを教えて',
  );
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    </main>
  );
}
