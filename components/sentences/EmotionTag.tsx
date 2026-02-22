'use client';

type EmotionTagProps = {
  word: string;
  selected: boolean;
  isCustom?: boolean;
  selectedBg?: string;
  selectedText?: string;
  onToggle: (word: string) => void;
  onRemove?: (word: string) => void;
};

export default function EmotionTag({
  word,
  selected,
  isCustom,
  selectedBg,
  selectedText,
  onToggle,
  onRemove,
}: EmotionTagProps) {
  const style =
    selected && selectedBg != null && selectedText != null
      ? { backgroundColor: selectedBg, color: selectedText }
      : undefined;

  return (
    <button
      type="button"
      onClick={() => onToggle(word)}
      style={style}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        selected && selectedBg != null
          ? ''
          : 'bg-light-gray text-gray-400 hover:bg-gray-200'
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
