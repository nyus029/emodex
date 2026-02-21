'use client';

import { KeyboardEvent, useState } from 'react';

type InlineTagInputProps = {
  onAdd: (word: string) => void;
};

export default function InlineTagInput({ onAdd }: InlineTagInputProps) {
  const [value, setValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed) {
        onAdd(trimmed);
        setValue('');
      }
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="追加..."
      className="min-w-[4rem] max-w-[8rem] border-none bg-transparent px-2 py-1.5 text-xs text-gray-700 outline-none placeholder:text-gray-400"
    />
  );
}
