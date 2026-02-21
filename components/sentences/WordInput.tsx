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
        className="min-w-[12rem] rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
      />
      <button
        type="submit"
        className="rounded-lg bg-light-gray px-3 py-2 text-sm font-medium text-gray-600"
      >
        追加
      </button>
    </form>
  );
}
