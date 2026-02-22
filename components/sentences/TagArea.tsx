'use client';

import EmotionTag from './EmotionTag';
import InlineTagInput from './InlineTagInput';

type TagAreaProps = {
  suggestedWords: string[];
  selectedSuggestedWords: string[];
  customWords: string[];
  isLoading?: boolean;
  onToggleSuggested: (word: string) => void;
  onAddCustom: (word: string) => void;
  onRemoveCustom: (word: string) => void;
};

/** 選択時共通の色（気分を綴るボタンと揃える） */
const SELECTED_BG = 'var(--color-green, #22c55e)';
const SELECTED_TEXT = '#ffffff';

export default function TagArea({
  suggestedWords,
  selectedSuggestedWords,
  customWords,
  isLoading,
  onToggleSuggested,
  onAddCustom,
  onRemoveCustom,
}: TagAreaProps) {
  const handleAddCustom = (word: string) => {
    if (
      !customWords.includes(word) &&
      !selectedSuggestedWords.includes(word) &&
      !suggestedWords.includes(word)
    ) {
      onAddCustom(word);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isLoading && (
        <span className="text-xs text-gray-400">単語を取得中...</span>
      )}
      {suggestedWords.map((word) => (
        <EmotionTag
          key={`s-${word}`}
          word={word}
          selected={selectedSuggestedWords.includes(word)}
          selectedBg={SELECTED_BG}
          selectedText={SELECTED_TEXT}
          onToggle={onToggleSuggested}
        />
      ))}
      {customWords.map((word) => (
        <EmotionTag
          key={`c-${word}`}
          word={word}
          selected
          isCustom
          selectedBg={SELECTED_BG}
          selectedText={SELECTED_TEXT}
          onToggle={() => {}}
          onRemove={onRemoveCustom}
        />
      ))}
      <InlineTagInput onAdd={handleAddCustom} />
    </div>
  );
}
