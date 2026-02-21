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
  const active = 'bg-green text-white';
  const inactive = 'bg-light-gray text-gray-500 active:bg-gray-200';

  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-gray-600">エモタイプ</span>
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
