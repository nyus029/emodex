'use client';

import TagArea from './TagArea';

type UnifiedMoodFormProps = {
  suggestedWords: string[];
  selectedSuggestedWords: string[];
  customWords: string[];
  isLoading: boolean;
  isLoggedIn: boolean;
  isSuggestedWordsLoading?: boolean;
  cooldownSeconds?: number;
  onToggleSuggested: (word: string) => void;
  onAddCustom: (word: string) => void;
  onRemoveCustom: (word: string) => void;
  onSubmit: () => void;
  totalSelectedCount: number;
};

function formatCooldown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `あと${m}分${s}秒`;
}

export default function UnifiedMoodForm({
  suggestedWords,
  selectedSuggestedWords,
  customWords,
  isLoading,
  isLoggedIn,
  isSuggestedWordsLoading,
  cooldownSeconds = 0,
  onToggleSuggested,
  onAddCustom,
  onRemoveCustom,
  onSubmit,
  totalSelectedCount,
}: UnifiedMoodFormProps) {
  const isCooldown = isLoggedIn && cooldownSeconds > 0;

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
        disabled={isLoading || totalSelectedCount === 0 || isCooldown}
        className="w-fit rounded-lg bg-green px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isLoading
          ? '処理中...'
          : isCooldown
            ? formatCooldown(cooldownSeconds)
            : isLoggedIn
              ? '心象を記録する'
              : '文章を生成'}
      </button>
    </div>
  );
}
