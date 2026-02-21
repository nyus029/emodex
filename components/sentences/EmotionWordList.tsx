'use client';

import { EMOTION_WORDS } from '@/components/sentence/EmotionWordsMock';

type EmotionWordListProps = {
  selectedWords: string[];
  onToggle: (word: string) => void;
};

export default function EmotionWordList({
  selectedWords,
  onToggle,
}: EmotionWordListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {EMOTION_WORDS.map((word) => {
        const isSelected = selectedWords.includes(word);
        return (
          <button
            key={word}
            type="button"
            onClick={() => onToggle(word)}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              isSelected
                ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900'
                : 'border border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700'
            }`}
          >
            {word}
          </button>
        );
      })}
    </div>
  );
}

export { EMOTION_WORDS };
