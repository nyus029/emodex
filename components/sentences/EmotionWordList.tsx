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
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isSelected
                ? 'bg-green text-white'
                : 'bg-light-gray text-gray-500 hover:bg-gray-200'
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
