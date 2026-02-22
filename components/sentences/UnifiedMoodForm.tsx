'use client';

import TagArea from './TagArea';

type UnifiedMoodFormProps = {
  suggestedWords: string[];
  selectedSuggestedWords: string[];
  customWords: string[];
  isLoading: boolean;
  isLoggedIn: boolean;
  isSuggestedWordsLoading?: boolean;
  onToggleSuggested: (word: string) => void;
  onAddCustom: (word: string) => void;
  onRemoveCustom: (word: string) => void;
  onSubmit: () => void;
  totalSelectedCount: number;
};

export default function UnifiedMoodForm({
  suggestedWords,
  selectedSuggestedWords,
  customWords,
  isLoading,
  isLoggedIn,
  isSuggestedWordsLoading,
  onToggleSuggested,
  onAddCustom,
  onRemoveCustom,
  onSubmit,
  totalSelectedCount,
}: UnifiedMoodFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <TagArea
        suggestedWords={suggestedWords}
        selectedSuggestedWords={selectedSuggestedWords}
        customWords={customWords}
        isLoading={isSuggestedWordsLoading}
        onToggleSuggested={onToggleSuggested}
        onAddCustom={onAddCustom}
        onRemoveCustom={onRemoveCustom}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={isLoading || totalSelectedCount === 0}
        className="w-fit rounded-lg bg-green px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isLoading ? '生成中...' : isLoggedIn ? '気分を綴る' : '文章を生成'}
      </button>
    </div>
  );
}
