import { useState, type KeyboardEvent } from 'react';

type TagInputProps = {
  tags: string[];
  suggestions: string[];
  onTagsChange: (tags: string[]) => void;
};

export default function TagInput({
  tags,
  suggestions,
  onTagsChange,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed) || tags.length >= 20) return;
    onTagsChange([...tags, trimmed]);
    setInputValue('');
  };

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  const unusedSuggestions = suggestions.filter((s) => !tags.includes(s));

  return (
    <div className="grid gap-2">
      <label className="grid gap-1">
        <span className="text-sm">タグ（任意、Enterで追加）</span>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="rounded border px-3 py-2"
          placeholder="タグを入力してEnter"
          maxLength={50}
        />
      </label>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, i) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-0.5 text-xs dark:bg-zinc-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-zinc-500">サジェスト:</span>
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="rounded-full border px-2 py-0.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
