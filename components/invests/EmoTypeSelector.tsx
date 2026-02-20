type EmoType = 'PRIVATE' | 'SHARED';

type EmoTypeSelectorProps = {
  value: EmoType;
  onChange: (type: EmoType) => void;
};

export default function EmoTypeSelector({
  value,
  onChange,
}: EmoTypeSelectorProps) {
  const base =
    'flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors';
  const active = 'bg-black text-white dark:bg-white dark:text-black';
  const inactive =
    'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700';

  return (
    <div className="grid gap-1">
      <span className="text-sm">エモタイプ</span>
      <div className="flex gap-2">
        <button
          type="button"
          className={`${base} ${value === 'PRIVATE' ? active : inactive}`}
          onClick={() => onChange('PRIVATE')}
        >
          非公開エモ（個人）
        </button>
        <button
          type="button"
          className={`${base} ${value === 'SHARED' ? active : inactive}`}
          onClick={() => onChange('SHARED')}
        >
          公開エモ（グループ共有）
        </button>
      </div>
    </div>
  );
}
