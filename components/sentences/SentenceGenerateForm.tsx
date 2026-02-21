'use client';

import EmotionWordList from './EmotionWordList';
import WordInput from './WordInput';

type SentenceGenerateFormProps = {
  selectedWords: string[];
  onToggleWord: (word: string) => void;
  onAddWord: (word: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
};

export default function SentenceGenerateForm({
  selectedWords,
  onToggleWord,
  onAddWord,
  onGenerate,
  isGenerating,
}: SentenceGenerateFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          感情ワード（クリックで選択/解除）
        </h3>
        <EmotionWordList
          selectedWords={selectedWords}
          onToggle={onToggleWord}
        />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          手動で単語を追加
        </h3>
        <WordInput onAdd={onAddWord} />
      </div>
      {selectedWords.length > 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          選択中: {selectedWords.join('、')}
        </p>
      )}
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating || selectedWords.length === 0}
        className="w-fit rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isGenerating ? '生成中...' : '文章を生成'}
      </button>
    </div>
  );
}
