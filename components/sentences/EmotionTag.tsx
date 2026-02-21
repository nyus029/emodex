'use client';

import { getTagColor } from './tag-colors';

type EmotionTagProps = {
  word: string;
  selected: boolean;
  isCustom?: boolean;
  onToggle: (word: string) => void;
  onRemove?: (word: string) => void;
};

export default function EmotionTag({
  word,
  selected,
  isCustom,
  onToggle,
  onRemove,
}: EmotionTagProps) {
  const color = getTagColor(word);

  return (
    <button
      type="button"
      onClick={() => onToggle(word)}
      style={
        selected ? { backgroundColor: color.bg, color: color.text } : undefined
      }
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        selected ? '' : 'bg-light-gray text-gray-400 hover:bg-gray-200'
      }`}
    >
      {word}
      {isCustom && selected && onRemove && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(word);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              onRemove(word);
            }
          }}
          className="ml-0.5 cursor-pointer opacity-70 hover:opacity-100"
        >
          &times;
        </span>
      )}
    </button>
  );
}
