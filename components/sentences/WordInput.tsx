'use client';

import { FormEvent, useState } from 'react';

type WordInputProps = {
  onAdd: (word: string) => void;
};

export default function WordInput({ onAdd }: WordInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="単語を入力して追加"
        className="min-w-[12rem] rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
      />
      <button
        type="submit"
        className="rounded bg-zinc-800 px-3 py-2 text-sm text-white dark:bg-zinc-200 dark:text-zinc-900"
      >
        追加
      </button>
    </form>
  );
}
