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
          onToggle={onToggleSuggested}
        />
      ))}
      {customWords.map((word) => (
        <EmotionTag
          key={`c-${word}`}
          word={word}
          selected
          isCustom
          onToggle={() => {}}
          onRemove={onRemoveCustom}
        />
      ))}
      <InlineTagInput onAdd={handleAddCustom} />
    </div>
  );
}
